import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { WalletAdapter } from "./WalletAdapter.js";
import type {
  WalletContextValue,
  WalletProviderProps,
  WalletUIConnectionState,
} from "./WalletContext.js";

// ─── Storage key ──────────────────────────────────────────────────────────────

const LAST_WALLET_KEY = "mintcore:lastWallet";

// ─── Context ──────────────────────────────────────────────────────────────────

/**
 * React context that holds the active wallet state and actions.
 *
 * Consume via {@link useWallet} — do not use this directly in components.
 */
export const WalletContext = createContext<WalletContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * `WalletProvider` wraps your application (or a subtree) and makes the active
 * wallet state and actions available to all descendant components via the
 * {@link useWallet} hook.
 *
 * ### Setup
 * ```tsx
 * import { WizardAdapter } from "mintcore";
 * import { WalletProvider } from "@mintcore/ui";
 *
 * const adapters = [new WizardAdapter({ client })];
 *
 * function App() {
 *   return (
 *     <WalletProvider adapters={adapters} autoConnect>
 *       <YourApp />
 *     </WalletProvider>
 *   );
 * }
 * ```
 */
export function WalletProvider({
  adapters,
  autoConnect = false,
  children,
}: WalletProviderProps): React.ReactElement {
  const [address, setAddress] = useState<string | null>(null);
  const [connectionState, setConnectionState] =
    useState<WalletUIConnectionState>("disconnected");
  const [error, setError] = useState<Error | null>(null);
  const [activeAdapter, setActiveAdapter] = useState<WalletAdapter | null>(null);

  // Keep a ref to the active adapter for event handler cleanup
  const activeAdapterRef = useRef<WalletAdapter | null>(null);

  // ── Internal helpers ────────────────────────────────────────────────────────

  const handleDisconnect = useCallback(() => {
    setAddress(null);
    setConnectionState("disconnected");
    setActiveAdapter(null);
    activeAdapterRef.current = null;
    try {
      localStorage.removeItem(LAST_WALLET_KEY);
    } catch {
      // localStorage may not be available in all environments.
    }
  }, []);

  const handleError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(error);
    setConnectionState("error");
  }, []);

  // ── Connect ─────────────────────────────────────────────────────────────────

  const connect = useCallback(
    async (adapterName: string): Promise<void> => {
      const adapter = adapters.find((a) => a.name === adapterName);
      if (!adapter) {
        throw new Error(`WalletProvider: no adapter found for "${adapterName}"`);
      }

      setConnectionState("connecting");
      setError(null);

      try {
        // Clean up any previously active adapter
        if (
          activeAdapterRef.current !== null &&
          activeAdapterRef.current !== adapter
        ) {
          activeAdapterRef.current.off?.("disconnect", handleDisconnect);
          activeAdapterRef.current.off?.("error", handleError);
          try {
            await activeAdapterRef.current.disconnect();
          } catch {
            // Ignore errors from the previous adapter.
          }
        }

        // Register lifecycle listeners before connecting so we don't miss
        // events that fire synchronously during the connect call.
        adapter.on("disconnect", handleDisconnect);
        adapter.on("error", handleError);

        await adapter.connect();

        const addr = await adapter.getAddress();

        activeAdapterRef.current = adapter;
        setActiveAdapter(adapter);
        setAddress(addr);
        setConnectionState("connected");

        try {
          localStorage.setItem(LAST_WALLET_KEY, adapterName);
        } catch {
          // localStorage may not be available in all environments.
        }
      } catch (err: unknown) {
        adapter.off?.("disconnect", handleDisconnect);
        adapter.off?.("error", handleError);

        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setConnectionState("error");
        throw error;
      }
    },
    [adapters, handleDisconnect, handleError]
  );

  // ── Disconnect ──────────────────────────────────────────────────────────────

  const disconnect = useCallback(async (): Promise<void> => {
    if (activeAdapterRef.current === null) {
      return;
    }

    const adapter = activeAdapterRef.current;
    adapter.off?.("disconnect", handleDisconnect);
    adapter.off?.("error", handleError);

    try {
      await adapter.disconnect();
    } catch {
      // Treat as disconnected regardless.
    }

    handleDisconnect();
  }, [handleDisconnect, handleError]);

  // ── Signing & broadcasting ───────────────────────────────────────────────────

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (activeAdapterRef.current === null) {
        throw new Error("WalletProvider: no wallet connected");
      }
      return activeAdapterRef.current.signMessage(message);
    },
    []
  );

  const signTransaction = useCallback(
    async (tx: Uint8Array): Promise<Uint8Array> => {
      if (activeAdapterRef.current === null) {
        throw new Error("WalletProvider: no wallet connected");
      }
      return activeAdapterRef.current.signTransaction(tx);
    },
    []
  );

  const broadcastTransaction = useCallback(
    async (rawTx: Uint8Array): Promise<string> => {
      if (activeAdapterRef.current === null) {
        throw new Error("WalletProvider: no wallet connected");
      }
      if (typeof activeAdapterRef.current.broadcastTransaction !== "function") {
        throw new Error(
          "WalletProvider: the active adapter does not support broadcastTransaction"
        );
      }
      return activeAdapterRef.current.broadcastTransaction(rawTx);
    },
    []
  );

  // ── Auto-reconnect on mount ─────────────────────────────────────────────────

  useEffect(() => {
    if (!autoConnect) {
      return;
    }

    let lastWallet: string | null = null;
    try {
      lastWallet = localStorage.getItem(LAST_WALLET_KEY);
    } catch {
      // localStorage may not be available.
    }

    if (lastWallet && adapters.some((a) => a.name === lastWallet)) {
      connect(lastWallet).catch((err: unknown) => {
        // Surface auto-reconnect failures via the error state so the UI can
        // prompt the user to reconnect manually.
        handleError(err);
      });
    }
    // `connect` is stable (wrapped in useCallback). We intentionally only
    // run this effect on autoConnect changes so that auto-reconnect does not
    // re-trigger when the `adapters` array reference changes (e.g. on re-renders).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoConnect]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (activeAdapterRef.current !== null) {
        activeAdapterRef.current.off?.("disconnect", handleDisconnect);
        activeAdapterRef.current.off?.("error", handleError);
      }
    };
  }, [handleDisconnect, handleError]);

  // ── Context value ───────────────────────────────────────────────────────────

  const value: WalletContextValue = {
    address,
    isConnected: connectionState === "connected",
    connectionState,
    error,
    activeAdapter,
    adapters,
    connect,
    disconnect,
    signMessage,
    signTransaction,
    broadcastTransaction,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// ─── Internal helper used by useWallet ────────────────────────────────────────

/**
 * Returns the current {@link WalletContextValue}.
 *
 * @internal — use {@link useWallet} in components.
 * @throws If called outside of a {@link WalletProvider}.
 */
export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (ctx === null) {
    throw new Error(
      "useWallet must be used inside a <WalletProvider>. " +
        "Wrap your component tree with <WalletProvider adapters={...}>"
    );
  }
  return ctx;
}
