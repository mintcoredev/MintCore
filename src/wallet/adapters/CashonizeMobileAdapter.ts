import { WizardConnectMobileAdapter } from "./WizardConnectMobileAdapter.js";
import { WalletType } from "../WalletTypes.js";

/**
 * WizardConnect mobile adapter for the Cashonize wallet.
 *
 * Uses the WizardConnect deep-link / redirect protocol to connect to Cashonize
 * on mobile devices where the browser extension is not available.
 *
 * ### Usage
 * ```ts
 * import { CashonizeMobileAdapter, createWalletRegistry } from "mintcore";
 *
 * const registry = createWalletRegistry([new CashonizeMobileAdapter()]);
 * ```
 */
export class CashonizeMobileAdapter extends WizardConnectMobileAdapter {
  readonly id = "cashonize";
  readonly name = "Cashonize";
  readonly type = WalletType.Cashonize;
}
