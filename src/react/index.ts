/**
 * MintCore React bindings
 *
 * Provides a wallet context, hook, and ready-made UI components for
 * integrating MintCore's wallet engine into a React application.
 *
 * ### Quick start
 * ```tsx
 * import { WizardAdapter, createWalletRegistry } from "mintcore";
 * import { WalletProvider, ConnectWalletButton } from "mintcore/react";
 *
 * const registry = createWalletRegistry([new WizardAdapter({ client })]);
 *
 * function App() {
 *   return (
 *     <WalletProvider adapters={registry.getAll()} autoConnect>
 *       <ConnectWalletButton />
 *     </WalletProvider>
 *   );
 * }
 * ```
 */

// ── Context & Provider ────────────────────────────────────────────────────────
export { WalletProvider, WalletContext } from "./WalletProvider.js";
export type { WalletContextValue, WalletProviderProps, WalletUIConnectionState } from "./WalletContext.js";

// ── Hook ──────────────────────────────────────────────────────────────────────
export { useWallet } from "./useWallet.js";

// ── Components ────────────────────────────────────────────────────────────────
export { ConnectWalletButton } from "./ConnectWalletButton.js";
export type { ConnectWalletButtonProps } from "./ConnectWalletButton.js";
