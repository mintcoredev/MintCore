import { useWalletContext } from "./WalletProvider.js";
import type { WalletContextValue } from "./WalletContext.js";

/**
 * `useWallet` — the primary hook for interacting with the wallet system.
 *
 * Returns the full {@link WalletContextValue} from the nearest
 * {@link WalletProvider} ancestor, including the wallet state and all action
 * functions.
 *
 * This hook is completely framework-agnostic with respect to wallet
 * implementations — it knows nothing about any specific wallet protocol or
 * protocol.  All wallet logic is encapsulated in the active
 * {@link WalletAdapter}.
 *
 * ### Usage
 * ```tsx
 * import { useWallet } from "@mintcore/ui";
 *
 * function MyComponent() {
 *   const {
 *     address,
 *     isConnected,
 *     connectionState,
 *     adapters,
 *     connect,
 *     disconnect,
 *     signMessage,
 *     signTransaction,
 *   } = useWallet();
 *
 *   return (
 *     <button onClick={() => connect("Paytaca")}>
 *       {isConnected ? address : "Connect Wallet"}
 *     </button>
 *   );
 * }
 * ```
 *
 * @throws If called outside of a `<WalletProvider>`.
 */
export function useWallet(): WalletContextValue {
  return useWalletContext();
}
