/**
 * MintCore UI layer
 *
 * React bindings for the MintCore SDK.  Provides wallet context, hook, and
 * ready-made UI components for integrating MintCore into a React application.
 *
 * The SDK (`mintcore`) is a pure TypeScript library with no React dependency.
 * This UI layer imports from the SDK but is never imported by the SDK.
 *
 * ### Quick start
 * ```tsx
 * import { WizardAdapter } from "mintcore";
 * import { WalletProvider, ConnectWalletButton } from "@mintcore/ui";
 *
 * const adapters = [new WizardAdapter({ client })];
 *
 * function App() {
 *   return (
 *     <WalletProvider adapters={adapters} autoConnect>
 *       <ConnectWalletButton />
 *     </WalletProvider>
 *   );
 * }
 * ```
 */

// ── Wallet adapter re-exports (from SDK) ──────────────────────────────────────
export type { WalletAdapter } from "./wallet/WalletAdapter.js";
export { WizardAdapter } from "./wallet/adapters/WizardAdapter.js";
export type { WizardAdapterClientLike, BchSourceOutput } from "./wallet/adapters/WizardAdapter.js";

// ── Context & Provider ────────────────────────────────────────────────────────
export { WalletProvider, WalletContext } from "./wallet/WalletProvider.js";
export type {
  WalletContextValue,
  WalletProviderProps,
  WalletUIConnectionState,
} from "./wallet/WalletContext.js";

// ── Hook ──────────────────────────────────────────────────────────────────────
export { useWallet } from "./wallet/useWallet.js";

// ── Components ────────────────────────────────────────────────────────────────
export { ConnectWalletButton } from "./components/ConnectWalletButton.js";
export type { ConnectWalletButtonProps } from "./components/ConnectWalletButton.js";
