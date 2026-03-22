/**
 * Supported BCH wallet applications that can be connected via Wizard Connect.
 */
export enum WalletType {
  Paytaca = "paytaca",
  Cashonize = "cashonize",
  Zapit = "zapit",
}

/**
 * BCH network identifier.
 */
export type BchNetwork = "mainnet" | "testnet" | "regtest";

/**
 * CAIP-2 chain identifiers used by BCH wallets.
 */
export const BCH_CHAIN_IDS: Record<BchNetwork, string> = {
  mainnet: "bch:bitcoincash",
  testnet: "bch:bchtest",
  regtest: "bch:bchreg",
} as const;

/**
 * Connection lifecycle states managed by {@link WalletManager}.
 */
export enum WalletConnectionState {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
  Reconnecting = "reconnecting",
  Error = "error",
}

/**
 * Represents an established Wizard Connect session for a BCH wallet.
 */
export interface WalletSession {
  /** Wizard Connect session identifier (unique per connection). */
  id: string;
  /** CashAddr (with network prefix) of the connected wallet account. */
  address: string;
  /** Wallet application that approved this session. */
  walletType: WalletType;
  /** Unix timestamp (ms) when the session was established. */
  createdAt: number;
  /** Unix timestamp (ms) when the session expires, if known. */
  expiry?: number;
}

/**
 * Event names emitted by {@link WalletManager}.
 */
export type WalletEventName =
  | "connect"
  | "disconnect"
  | "stateChange"
  | "error";

/**
 * Payload delivered with each {@link WalletEventName}.
 */
export interface WalletEventPayload {
  connect: WalletSession;
  disconnect: void;
  stateChange: WalletConnectionState;
  error: Error;
}
