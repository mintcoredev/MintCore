import { WizardAdapter } from "./WizardAdapter.js";
import { WalletType } from "../WalletTypes.js";

/**
 * WizardConnect adapter for the Paytaca browser-extension wallet.
 *
 * Reads the Paytaca WizardConnect client from `window.paytaca.wizardconnect`
 * when running in a browser environment.  If the extension is not installed
 * the client is `null` and `connect()` will throw a descriptive error.
 *
 * ### Usage
 * ```ts
 * import { PaytacaAdapter, createWalletRegistry } from "mintcore";
 *
 * const registry = createWalletRegistry([new PaytacaAdapter()]);
 * ```
 */
export class PaytacaAdapter extends WizardAdapter {
  constructor() {
    super({
      type: WalletType.Paytaca,
      client:
        typeof (globalThis as any).paytaca !== "undefined"
          ? (globalThis as any).paytaca?.wizardconnect ?? null
          : null,
    });
  }
}
