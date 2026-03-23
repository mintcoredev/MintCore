/**
 * Re-exports the WizardConnect adapter from the MintCore SDK.
 *
 * Import from here within the UI layer instead of reaching into the SDK
 * internals directly.  This keeps UI code decoupled from the SDK's internal
 * folder structure.
 *
 * @example
 * ```ts
 * import { WizardAdapter } from "@mintcore/ui";
 * ```
 */
export {
  WizardAdapter,
} from "../../../wallet/adapters/WizardAdapter.js";
export type {
  WizardAdapterClientLike,
  BchSourceOutput,
} from "../../../wallet/adapters/WizardAdapter.js";
