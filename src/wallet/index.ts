/**
 * MintCore Wallet Engine
 *
 * Wizard Connect integration for Bitcoin Cash.
 * Supports Paytaca, Cashonize, and Zapit wallets.
 *
 * No UI, no React, no DOM — pure TypeScript engine.
 */

export {
  WalletClient,
  type WalletClientOptions,
  type WizardConnectClientLike,
  type WizardConnectSession,
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
  WizardAdapter,
  type WizardAdapterClientLike,
  type BchSourceOutput,
} from "./adapters/WizardAdapter.js";

export { PaytacaAdapter } from "./adapters/PaytacaAdapter.js";
export { ZapitAdapter } from "./adapters/ZapitAdapter.js";
export { CashonizeAdapter } from "./adapters/CashonizeAdapter.js";

export { WizardConnectMobileAdapter } from "./adapters/WizardConnectMobileAdapter.js";
export { PaytacaMobileAdapter } from "./adapters/PaytacaMobileAdapter.js";
export { ZapitMobileAdapter } from "./adapters/ZapitMobileAdapter.js";
export { CashonizeMobileAdapter } from "./adapters/CashonizeMobileAdapter.js";

export {
  WalletRegistry,
  createWalletRegistry,
  createAdaptiveWalletRegistry,
} from "./registry.js";
