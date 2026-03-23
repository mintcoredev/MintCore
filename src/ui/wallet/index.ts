// ── Adapter interface ─────────────────────────────────────────────────────────
export type { WalletAdapter } from "./WalletAdapter.js";

// ── Context & Provider ────────────────────────────────────────────────────────
export { WalletProvider, WalletContext } from "./WalletProvider.js";
export type {
  WalletContextValue,
  WalletProviderProps,
  WalletUIConnectionState,
} from "./WalletContext.js";

// ── Hook ──────────────────────────────────────────────────────────────────────
export { useWallet } from "./useWallet.js";

// ── Adapters ──────────────────────────────────────────────────────────────────
export { WizardAdapter } from "./adapters/WizardAdapter.js";
export type { WizardAdapterClientLike, BchSourceOutput } from "./adapters/WizardAdapter.js";
