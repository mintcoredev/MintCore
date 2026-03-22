/**
 * Re-exports the WizardConnect adapter from the MintCore SDK.
 *
 * Import from here within the UI layer instead of reaching into the SDK
 * internals directly.  This keeps UI code decoupled from the SDK's internal
 * folder structure.
 *
 * @example
 * ```ts
 * import { WizardAdapter } from "../wallet/adapters/WizardAdapter.js";
 * ```
 */
export {
  WizardAdapter,
} from "../../../src/wallet/adapters/WizardAdapter.js";
export type {
  WizardAdapterClientLike,
  BchSourceOutput,
} from "../../../src/wallet/adapters/WizardAdapter.js";
