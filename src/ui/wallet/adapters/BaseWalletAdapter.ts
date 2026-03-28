/**
 * Re-exports the base wallet adapter from the MintCore SDK.
 *
 * Import from here within the UI layer instead of reaching into the SDK
 * internals directly.  This keeps UI code decoupled from the SDK's internal
 * folder structure.
 *
 * @example
 * ```ts
 * import { BaseWalletAdapter } from "@mintcore/ui";
 * ```
 */
export {
  BaseWalletAdapter,
} from "../../../wallet/adapters/BaseWalletAdapter.js";
export type {
  WalletAdapterClientLike,
  BchSourceOutput,
} from "../../../wallet/adapters/BaseWalletAdapter.js";
