import { WizardAdapter } from "./WizardAdapter.js";
import { WalletType } from "../WalletTypes.js";

/**
 * WizardConnect adapter for the Cashonize browser-extension wallet.
 *
 * Reads the Cashonize WizardConnect client from `window.cashonize.wizardconnect`
 * when running in a browser environment.  If the extension is not installed
 * the client is `null` and `connect()` will throw a descriptive error.
 *
 * ### Usage
 * ```ts
 * import { CashonizeAdapter, createWalletRegistry } from "mintcore";
 *
 * const registry = createWalletRegistry([new CashonizeAdapter()]);
 * ```
 */
export class CashonizeAdapter extends WizardAdapter {
  constructor() {
    super({
      type: WalletType.Cashonize,
      client:
        typeof (globalThis as any).cashonize !== "undefined"
          ? (globalThis as any).cashonize?.wizardconnect ?? null
          : null,
    });
  }
}
