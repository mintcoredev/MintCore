import { WizardConnectMobileAdapter } from "./WizardConnectMobileAdapter.js";
import { WalletType } from "../WalletTypes.js";

/**
 * WizardConnect mobile adapter for the Zapit wallet.
 *
 * Uses the WizardConnect deep-link / redirect protocol to connect to Zapit
 * on mobile devices where the browser extension is not available.
 *
 * ### Usage
 * ```ts
 * import { ZapitMobileAdapter, createWalletRegistry } from "mintcore";
 *
 * const registry = createWalletRegistry([new ZapitMobileAdapter()]);
 * ```
 */
export class ZapitMobileAdapter extends WizardConnectMobileAdapter {
  readonly id = "zapit";
  readonly name = "Zapit";
  readonly type = WalletType.Zapit;
}
