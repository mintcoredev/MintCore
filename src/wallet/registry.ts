import type { WalletAdapter } from "./adapters/WalletAdapter.js";
import { PaytacaAdapter } from "./adapters/PaytacaAdapter.js";
import { ZapitAdapter } from "./adapters/ZapitAdapter.js";
import { CashonizeAdapter } from "./adapters/CashonizeAdapter.js";
import { PaytacaMobileAdapter } from "./adapters/PaytacaMobileAdapter.js";
import { ZapitMobileAdapter } from "./adapters/ZapitMobileAdapter.js";
import { CashonizeMobileAdapter } from "./adapters/CashonizeMobileAdapter.js";

// ─── WalletRegistry ───────────────────────────────────────────────────────────

/**
 * Registry of available wallet adapters.
 *
 * `WalletRegistry` is the single source of truth for which wallets are
 * supported by the application.  Pass a registry to `WalletProvider` and the
 * UI will automatically show all registered wallets in the connect dialog.
 *
 * ### Example
 * ```ts
 * import { WizardAdapter, createWalletRegistry } from "mintcore";
 *
 * const registry = createWalletRegistry([
 *   new WizardAdapter({ client: wizardClient }),
 *   // new PaytacaAdapter({ ... }),
 *   // new CashonizeAdapter({ ... }),
 * ]);
 * ```
 */
export class WalletRegistry {
  private readonly adapters: Map<string, WalletAdapter> = new Map();

  /**
   * Registers a wallet adapter.
   *
   * @param adapter - The adapter to register.  Its {@link WalletAdapter.name}
   *   is used as the registry key.  Registering an adapter with a duplicate
   *   name replaces the previous entry.
   * @returns `this` for chaining.
   */
  register(adapter: WalletAdapter): this {
    this.adapters.set(adapter.name, adapter);
    return this;
  }

  /**
   * Retrieves a registered adapter by name.
   *
   * @param name - The adapter name (case-sensitive).
   * @returns The adapter, or `undefined` if not registered.
   */
  get(name: string): WalletAdapter | undefined {
    return this.adapters.get(name);
  }

  /**
   * Returns all registered adapters in registration order.
   */
  getAll(): WalletAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Returns the names of all registered adapters.
   */
  getNames(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Returns `true` if an adapter with the given name is registered.
   */
  has(name: string): boolean {
    return this.adapters.has(name);
  }

  /**
   * Returns the number of registered adapters.
   */
  get size(): number {
    return this.adapters.size;
  }
}

// ─── Factory helper ───────────────────────────────────────────────────────────

/**
 * Creates a {@link WalletRegistry} pre-populated with the given adapters.
 *
 * @param adapters - Initial set of wallet adapters to register.
 *
 * @example
 * ```ts
 * const registry = createWalletRegistry([new WizardAdapter({ client })]);
 * ```
 */
export function createWalletRegistry(adapters: WalletAdapter[]): WalletRegistry {
  const registry = new WalletRegistry();
  for (const adapter of adapters) {
    registry.register(adapter);
  }
  return registry;
}

// ─── Adaptive factory helper ──────────────────────────────────────────────────

/**
 * Creates a {@link WalletRegistry} that automatically selects the correct
 * transport for each supported BCH wallet at runtime:
 *
 * - **Browser-extension transport**: used when the wallet exposes its
 *   WizardConnect client on `window.<wallet>.wizardconnect` (desktop browsers
 *   with the extension installed).
 * - **Mobile transport**: used as the fallback when no `window.*` client is
 *   detected (mobile browsers, extension not installed).
 *
 * Both transports implement the same {@link WalletAdapter} interface, so the
 * UI does not need to change.
 *
 * The function is safe to call during SSR/server-side rendering — it checks
 * for `globalThis` before accessing `window.*` properties.
 *
 * @example
 * ```ts
 * import { createAdaptiveWalletRegistry } from "mintcore";
 *
 * const registry = createAdaptiveWalletRegistry();
 * // Pass registry to WalletProvider — done.
 * ```
 */
export function createAdaptiveWalletRegistry(): WalletRegistry {
  const paytacaClient =
    typeof (globalThis as Record<string, unknown>).paytaca !== "undefined"
      ? ((globalThis as Record<string, unknown>).paytaca as Record<string, unknown>)?.wizardconnect ?? null
      : null;

  const zapitClient =
    typeof (globalThis as Record<string, unknown>).zapit !== "undefined"
      ? ((globalThis as Record<string, unknown>).zapit as Record<string, unknown>)?.wizardconnect ?? null
      : null;

  const cashonizeClient =
    typeof (globalThis as Record<string, unknown>).cashonize !== "undefined"
      ? ((globalThis as Record<string, unknown>).cashonize as Record<string, unknown>)?.wizardconnect ?? null
      : null;

  const adapters: WalletAdapter[] = [
    paytacaClient ? new PaytacaAdapter() : new PaytacaMobileAdapter(),
    zapitClient ? new ZapitAdapter() : new ZapitMobileAdapter(),
    cashonizeClient ? new CashonizeAdapter() : new CashonizeMobileAdapter(),
  ];

  return createWalletRegistry(adapters);
}
