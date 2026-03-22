/**
 * Re-exports the WalletAdapter interface from the MintCore SDK.
 *
 * Import from here within the UI layer instead of reaching into the SDK
 * internals directly.  This keeps UI code decoupled from the SDK's internal
 * folder structure.
 *
 * @example
 * ```ts
 * import type { WalletAdapter } from "../wallet/WalletAdapter.js";
 * ```
 */
export type { WalletAdapter } from "../../src/wallet/adapters/WalletAdapter.js";
