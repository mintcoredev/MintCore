import { BaseWalletAdapter } from "./BaseWalletAdapter.js";
import { WalletType } from "../WalletTypes.js";

/**
 * Adapter for the Paytaca browser-extension wallet.
 *
 * Reads the Paytaca wallet client from `window.paytaca` when running in a
 * browser environment.  If the extension is not installed the client is
 * `null` and `connect()` will throw a descriptive error.
 *
 * ### Usage
 * ```ts
 * import { PaytacaAdapter, createWalletRegistry } from "mintcore";
 *
 * const registry = createWalletRegistry([new PaytacaAdapter()]);
 * ```
 */
export class PaytacaAdapter extends BaseWalletAdapter {
  constructor() {
    super({
      type: WalletType.Paytaca,
      client:
        typeof (globalThis as any).paytaca !== "undefined"
          ? (globalThis as any).paytaca ?? null
          : null,
    });
  }
}
