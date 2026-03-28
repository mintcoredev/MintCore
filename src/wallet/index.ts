/**
 * MintCore Wallet Engine
 *
 * BCH wallet integration layer.
 * Supports Paytaca, Cashonize, and Zapit wallets.
 *
 * No UI, no React, no DOM — pure TypeScript engine.
 */

export {
  WalletClient,
  type WalletClientOptions,
  type BchWalletClientLike,
  type BchWalletSession,
} from "./WalletClient.js";

export {
  WalletManager,
  type WalletManagerOptions,
} from "./WalletManager.js";

export {
  WalletType,
  WalletConnectionState,
  BCH_CHAIN_IDS,
  type BchNetwork,
  type WalletSession,
  type WalletEventName,
  type WalletEventPayload,
} from "./WalletTypes.js";

export type { BchWalletAdapter } from "./adapters/BchWalletAdapter.js";
export type { WalletAdapter } from "./adapters/WalletAdapter.js";
export {
  BaseWalletAdapter,
  type WalletAdapterClientLike,
  type BchSourceOutput,
} from "./adapters/BaseWalletAdapter.js";

export { PaytacaAdapter } from "./adapters/PaytacaAdapter.js";
export { ZapitAdapter } from "./adapters/ZapitAdapter.js";
export { CashonizeAdapter } from "./adapters/CashonizeAdapter.js";

export {
  WalletRegistry,
  createWalletRegistry,
} from "./registry.js";
