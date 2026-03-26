import { WizardConnectMobileAdapter } from "./WizardConnectMobileAdapter.js";
import { WalletType } from "../WalletTypes.js";

/**
 * WizardConnect mobile adapter for the Paytaca wallet.
 *
 * Uses the WizardConnect deep-link / redirect protocol to connect to Paytaca
 * on mobile devices where the browser extension is not available.
 *
 * ### Usage
 * ```ts
 * import { PaytacaMobileAdapter, createWalletRegistry } from "mintcore";
 *
 * const registry = createWalletRegistry([new PaytacaMobileAdapter()]);
 * ```
 */
export class PaytacaMobileAdapter extends WizardConnectMobileAdapter {
  readonly id = "paytaca";
  readonly name = "Paytaca";
  readonly type = WalletType.Paytaca;
}
