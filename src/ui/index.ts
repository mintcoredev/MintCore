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
 * import { BaseWalletAdapter, WalletProvider, ConnectWalletButton } from "@mintcore/ui";
 *
 * const adapters = [new BaseWalletAdapter({ client })];
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

export * from "./wallet/index.js";
export * from "./components/index.js";
