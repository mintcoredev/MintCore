/**
 * MintCore Wallet Engine
 *
 * Framework-agnostic WalletConnect v2 integration for Bitcoin Cash.
 * Supports Paytaca, Cashonize, and Zapit wallets.
 *
 * No UI, no React, no DOM — pure TypeScript engine.
 */

export {
  WalletClient,
  type WalletClientOptions,
  type WalletConnectV2Client,
  type WalletConnectSession,
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
