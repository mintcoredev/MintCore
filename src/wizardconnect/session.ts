/**
 * WizardConnect mobile session utilities.
 *
 * Handles the session handshake that takes place when a mobile wallet
 * redirects back to the dApp after a connection request:
 *
 * 1. The dApp generates an ephemeral secp256k1 keypair and stores the private
 *    key in `sessionStorage`.
 * 2. The dApp sends the public key (inside the WizardConnect URI payload) to
 *    the wallet app.
 * 3. The wallet encrypts the session data with the dApp's ephemeral public key
 *    (via ECDH + AES-256-GCM) and passes the ciphertext back in the redirect
 *    URL as `?session=<base64url>`.
 * 4. The dApp decrypts the session using its stored ephemeral private key and
 *    persists the resulting address/sessionId for use by the adapter.
 */

import { fromHex } from "../utils/hex.js";
import { base64urlDecode } from "../utils/base64url.js";
import { ecdhSharedSecret, importAesKey, aesGcmDecrypt } from "../utils/crypto.js";
import { MintCoreError } from "../utils/errors.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Encrypted session envelope passed by the wallet in the redirect URL's
 * `?session=` query parameter (base64url-encoded JSON of this shape).
 */
export interface WizardConnectEncryptedSession {
  /** Wallet's secp256k1 compressed public key as a lowercase hex string. */
  walletPublicKey: string;
  /** AES-256-GCM initialisation vector as a base64url string (12 bytes). */
  iv: string;
  /** AES-256-GCM ciphertext (includes authentication tag) as base64url. */
  ciphertext: string;
}

/**
 * Decrypted session data produced after a successful WizardConnect handshake.
 */
export interface WizardConnectMobileSession {
  /** CashAddress of the connected wallet account. */
  address: string;
  /** Unique session identifier assigned by the wallet. */
  sessionId: string;
  /** Unix timestamp (ms) when the session expires, if provided. */
  expiry?: number;
}

// ─── sessionStorage keys ──────────────────────────────────────────────────────

const EPHEMERAL_KEY_STORAGE_KEY = "wc_mobile_ephemeral_privkey";
const SESSION_STORAGE_KEY = "wc_mobile_session";

// ─── sessionStorage helpers (browser-only) ────────────────────────────────────

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const storage: StorageLike | null =
  typeof (globalThis as Record<string, unknown>).sessionStorage !== "undefined"
    ? (globalThis as Record<string, unknown>).sessionStorage as StorageLike
    : null;

function storageSet(key: string, value: string): void {
  storage?.setItem(key, value);
}

function storageGet(key: string): string | null {
  return storage?.getItem(key) ?? null;
}

function storageDel(key: string): void {
  storage?.removeItem(key);
}

// ─── Ephemeral private key helpers ────────────────────────────────────────────

/**
 * Persists an ephemeral private key in `sessionStorage` so it survives a
 * redirect away from the current page.
 *
 * @param privKeyHex - 64-character lowercase hex string.
 */
export function saveEphemeralPrivKey(privKeyHex: string): void {
  storageSet(EPHEMERAL_KEY_STORAGE_KEY, privKeyHex);
}

/**
 * Loads the ephemeral private key from `sessionStorage`.
 *
 * @returns The hex string, or `null` if not present.
 */
export function loadEphemeralPrivKey(): string | null {
  return storageGet(EPHEMERAL_KEY_STORAGE_KEY);
}

/**
 * Removes the ephemeral private key from `sessionStorage`.
 */
export function clearEphemeralPrivKey(): void {
  storageDel(EPHEMERAL_KEY_STORAGE_KEY);
}

// ─── Session persistence helpers ──────────────────────────────────────────────

/**
 * Persists a decrypted mobile session in `sessionStorage`.
 *
 * @param session - The decrypted session to persist.
 */
export function saveMobileSession(session: WizardConnectMobileSession): void {
  storageSet(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Loads a previously persisted mobile session from `sessionStorage`.
 *
 * @returns The session, or `null` if none is stored or the stored value is
 *   malformed.
 */
export function loadMobileSession(): WizardConnectMobileSession | null {
  const raw = storageGet(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as WizardConnectMobileSession;
  } catch {
    return null;
  }
}

/**
 * Removes the persisted mobile session from `sessionStorage`.
 */
export function clearMobileSession(): void {
  storageDel(SESSION_STORAGE_KEY);
}

// ─── Session decryption ───────────────────────────────────────────────────────

/**
 * Decrypts an encrypted session envelope using the dApp's ephemeral private
 * key and the wallet's public key (ECDH + AES-256-GCM).
 *
 * @param encryptedSession - The encrypted session envelope from the wallet.
 * @param ephemeralPrivKey - 32-byte ephemeral private key bytes.
 * @returns The decrypted {@link WizardConnectMobileSession}.
 * @throws {MintCoreError} if ECDH or AES-GCM decryption fails, or if the
 *   decrypted payload is not a valid JSON session object.
 */
export async function decryptMobileSession(
  encryptedSession: WizardConnectEncryptedSession,
  ephemeralPrivKey: Uint8Array
): Promise<WizardConnectMobileSession> {
  const walletPubKey = fromHex(encryptedSession.walletPublicKey);
  const sharedSecret = ecdhSharedSecret(ephemeralPrivKey, walletPubKey);
  const aesKey = await importAesKey(sharedSecret);
  const iv = base64urlDecode(encryptedSession.iv);
  const ciphertext = base64urlDecode(encryptedSession.ciphertext);
  const plaintext = await aesGcmDecrypt(aesKey, iv, ciphertext);

  const text = new TextDecoder().decode(plaintext);

  let session: WizardConnectMobileSession;
  try {
    session = JSON.parse(text) as WizardConnectMobileSession;
  } catch {
    throw new MintCoreError(
      "WizardConnect: decrypted session payload is not valid JSON"
    );
  }

  if (typeof session.address !== "string" || session.address.trim() === "") {
    throw new MintCoreError(
      "WizardConnect: decrypted session is missing a valid address"
    );
  }
  if (typeof session.sessionId !== "string" || session.sessionId.trim() === "") {
    throw new MintCoreError(
      "WizardConnect: decrypted session is missing a valid sessionId"
    );
  }

  return session;
}

// ─── Full redirect-back handler ───────────────────────────────────────────────

/**
 * Processes the `?session=` query parameter written by the wallet after a
 * successful mobile connection.
 *
 * Call this from the redirect-handler route (e.g. `/wc`):
 *
 * ```ts
 * const session = await handleWizardConnectRedirect(
 *   new URLSearchParams(window.location.search).get("session") ?? ""
 * );
 * if (session) {
 *   // redirect to "/"
 * }
 * ```
 *
 * The function:
 * 1. Loads the ephemeral private key from `sessionStorage`.
 * 2. Base64url-decodes and JSON-parses the `sessionParam`.
 * 3. Decrypts the session using ECDH + AES-256-GCM.
 * 4. Saves the decrypted session to `sessionStorage`.
 * 5. Removes the ephemeral private key from `sessionStorage`.
 *
 * @param sessionParam - The raw value of the `?session=` query parameter.
 * @returns The decrypted session, or `null` if processing fails.
 */
export async function handleWizardConnectRedirect(
  sessionParam: string
): Promise<WizardConnectMobileSession | null> {
  if (!sessionParam) {
    return null;
  }

  const privKeyHex = loadEphemeralPrivKey();
  if (!privKeyHex) {
    return null;
  }

  let envelope: WizardConnectEncryptedSession;
  try {
    const decoded = base64urlDecode(sessionParam);
    envelope = JSON.parse(new TextDecoder().decode(decoded)) as WizardConnectEncryptedSession;
  } catch {
    return null;
  }

  try {
    const ephemeralPrivKey = fromHex(privKeyHex);
    const session = await decryptMobileSession(envelope, ephemeralPrivKey);
    saveMobileSession(session);
    clearEphemeralPrivKey();
    return session;
  } catch {
    return null;
  }
}
