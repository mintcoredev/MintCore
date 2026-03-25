import { WizardAdapter } from "./WizardAdapter.js";
import { WalletType } from "../WalletTypes.js";

/**
 * WizardConnect adapter for the Zapit browser-extension wallet.
 *
 * Reads the Zapit WizardConnect client from `window.zapit.wizardconnect`
 * when running in a browser environment.  If the extension is not installed
 * the client is `null` and `connect()` will throw a descriptive error.
 *
 * ### Usage
 * ```ts
 * import { ZapitAdapter, createWalletRegistry } from "mintcore";
 *
 * const registry = createWalletRegistry([new ZapitAdapter()]);
 * ```
 */
export class ZapitAdapter extends WizardAdapter {
  constructor() {
    super({
      type: WalletType.Zapit,
      client:
        typeof (globalThis as any).zapit !== "undefined"
          ? (globalThis as any).zapit?.wizardconnect ?? null
          : null,
    });
  }
}
