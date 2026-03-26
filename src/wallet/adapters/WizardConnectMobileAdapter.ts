/**
 * Abstract base class for WizardConnect mobile wallet adapters.
 *
 * Implements the full WizardConnect mobile connection protocol:
 * 1. Generates an ephemeral secp256k1 keypair.
 * 2. Encodes a payload containing the ephemeral public key and return URL.
 * 3. Opens the wallet app via a `wizardconnect://v1/connect?payload=...` URI.
 * 4. After the wallet redirects back, the session is decrypted and persisted by
 *    the redirect-handler route (`/wc`).  `connect()` restores that session on
 *    the next call.
 *
 * Subclasses only need to declare `id`, `name`, and `type`.
 *
 * ### Usage
 * ```ts
 * // Prefer createAdaptiveWalletRegistry() which picks the right transport
 * // automatically.  The mobile adapter can also be used directly:
 * const adapter = new PaytacaMobileAdapter();
 * registry.register(adapter);
 * ```
 *
 * ### Mobile vs. browser extension
 * - Browser extensions expose `window.paytaca.wizardconnect` and use
 *   {@link WizardAdapter} (synchronous/in-page flow).
 * - Mobile wallets are not reachable via `window.*`; they use a deep-link /
 *   redirect flow handled by this class.
 *
 * ### Signing
 * Transaction and message signing via mobile WizardConnect uses an additional
 * deep-link round-trip that is outside the scope of the connection handshake.
 * `signTransaction` and `signMessage` therefore throw a `MintCoreError` with a
 * descriptive message until that flow is implemented.
 */

import { generatePrivateKey, secp256k1 } from "@bitauth/libauth";
import { toHex } from "../../utils/hex.js";
import { base64urlEncode } from "../../utils/base64url.js";
import { MintCoreError } from "../../utils/errors.js";
import type { WalletAdapter } from "./WalletAdapter.js";
import { WalletType } from "../WalletTypes.js";
import {
  saveEphemeralPrivKey,
  clearEphemeralPrivKey,
  saveMobileSession,
  loadMobileSession,
  clearMobileSession,
  type WizardConnectMobileSession,
} from "../../wizardconnect/session.js";

// ─── WizardConnect payload ────────────────────────────────────────────────────

interface WizardConnectPayload {
  version: "1";
  publicKey: string;
  returnUrl: string;
  metadata: {
    name: string;
    description: string;
  };
}

// ─── WizardConnectMobileAdapter ───────────────────────────────────────────────

/**
 * Abstract base class that implements the WizardConnect mobile handshake.
 *
 * Concrete subclasses ({@link PaytacaMobileAdapter}, etc.) only need to
 * declare `id`, `name`, and `type`.
 */
export abstract class WizardConnectMobileAdapter implements WalletAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly type: WalletType;

  private session: WizardConnectMobileSession | null = null;

  private readonly eventListeners: Map<
    string,
    Array<(...args: unknown[]) => void>
  > = new Map();

  constructor() {
    // Restore any previously established session that survived a page redirect.
    this.session = loadMobileSession();
  }

  // ─── WalletAdapter implementation ─────────────────────────────────────────

  /**
   * Initiates the WizardConnect mobile connection flow.
   *
   * If a session already exists in `sessionStorage` (i.e. the wallet has
   * already approved the connection and the redirect handler has processed it),
   * this resolves immediately.
   *
   * Otherwise it:
   * 1. Generates an ephemeral secp256k1 keypair.
   * 2. Persists the private key in `sessionStorage`.
   * 3. Builds the `wizardconnect://v1/connect?payload=…` URI.
   * 4. Navigates to that URI via `window.location.href`, handing control to
   *    the wallet app.
   *
   * The page will be redirected away from — `connect()` resolves before the
   * navigation occurs.  When the wallet redirects back, the app's `/wc` route
   * must call {@link handleWizardConnectRedirect} to decrypt and persist the
   * session; subsequent calls to `connect()` will then succeed immediately.
   */
  async connect(): Promise<void> {
    // Restore from sessionStorage in case this is a post-redirect re-init.
    if (!this.session) {
      this.session = loadMobileSession();
    }

    if (this.session) {
      this.emit("connect", this.session.address);
      return;
    }

    // ── Generate ephemeral keypair ──────────────────────────────────────────
    const privKeyBytes = generatePrivateKey();
    const pubKeyResult = secp256k1.derivePublicKeyCompressed(privKeyBytes);
    if (typeof pubKeyResult === "string") {
      throw new MintCoreError(
        `${this.name}: failed to derive ephemeral public key — ${pubKeyResult}`
      );
    }

    // ── Persist private key for post-redirect decryption ───────────────────
    saveEphemeralPrivKey(toHex(privKeyBytes));

    // ── Build WizardConnect URI ─────────────────────────────────────────────
    const returnUrl = this.buildReturnUrl();
    const payload: WizardConnectPayload = {
      version: "1",
      publicKey: toHex(pubKeyResult),
      returnUrl,
      metadata: {
        name: this.name,
        description: "MintCore dApp",
      },
    };

    const encodedPayload = base64urlEncode(
      new TextEncoder().encode(JSON.stringify(payload))
    );
    const uri = `wizardconnect://v1/connect?payload=${encodedPayload}`;

    // ── Trigger wallet app ─────────────────────────────────────────────────
    // The page will be navigated away; resolve before that happens so callers
    // can perform any cleanup.
    (globalThis as Record<string, unknown> & { location?: { href: string } }).location!.href = uri;
  }

  /**
   * Disconnects the mobile WizardConnect session and clears all stored state.
   */
  async disconnect(): Promise<void> {
    if (!this.session) {
      return;
    }
    this.session = null;
    clearMobileSession();
    clearEphemeralPrivKey();
    this.emit("disconnect");
  }

  /**
   * Returns the CashAddress of the connected wallet.
   *
   * @throws {MintCoreError} if not connected (call {@link connect} first, then
   *   wait for the wallet's redirect to be processed).
   */
  async getAddress(): Promise<string> {
    if (!this.session) {
      this.session = loadMobileSession();
    }
    if (!this.session) {
      throw new MintCoreError(
        `${this.name}: not connected — complete the WizardConnect pairing flow first`
      );
    }
    return this.session.address;
  }

  /**
   * Message signing via mobile WizardConnect requires an additional deep-link
   * round-trip and is not yet implemented.
   *
   * @throws {MintCoreError} always.
   */
  async signMessage(_message: string): Promise<string> {
    throw new MintCoreError(
      `${this.name}: signMessage is not yet supported for mobile WizardConnect adapters`
    );
  }

  /**
   * Transaction signing via mobile WizardConnect requires an additional
   * deep-link round-trip and is not yet implemented.
   *
   * @throws {MintCoreError} always.
   */
  async signTransaction(_tx: Uint8Array): Promise<Uint8Array> {
    throw new MintCoreError(
      `${this.name}: signTransaction is not yet supported for mobile WizardConnect adapters`
    );
  }

  /**
   * Registers a listener for a wallet event.
   *
   * @param event    - Event name (e.g. `"connect"`, `"disconnect"`, `"error"`).
   * @param callback - Callback invoked when the event fires.
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Removes a previously registered event listener.
   *
   * @param event    - Event name the listener was registered under.
   * @param callback - The exact callback function to remove.
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners === undefined) {
      return;
    }
    const idx = listeners.indexOf(callback);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  }

  // ─── Session access (for redirect handler) ─────────────────────────────────

  /**
   * Loads a freshly-decrypted session into the adapter.
   *
   * Call this after {@link handleWizardConnectRedirect} has decrypted and
   * persisted the session, to avoid the need for a full page reload before
   * `getAddress()` works.
   *
   * @param session - The decrypted mobile session.
   */
  setSession(session: WizardConnectMobileSession): void {
    this.session = session;
    saveMobileSession(session);
    this.emit("connect", session.address);
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Builds the URL the wallet should redirect to after approving the
   * connection.  Defaults to `<origin>/wc` but can be overridden by
   * subclasses that use a different route.
   */
  protected buildReturnUrl(): string {
    const loc = (globalThis as Record<string, unknown> & { location?: { origin: string } }).location;
    const origin = loc?.origin ?? "";
    return `${origin}/wc`;
  }

  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners === undefined) {
      return;
    }
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch {
        // Event listeners must not crash the adapter.
      }
    }
  }
}
