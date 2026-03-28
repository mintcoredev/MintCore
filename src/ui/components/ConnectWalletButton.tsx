import React, { useCallback, useState } from "react";
import { useWallet } from "../wallet/useWallet.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) {
    return address;
  }
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

// ─── ConnectWalletButton ──────────────────────────────────────────────────────

export interface ConnectWalletButtonProps {
  /** Override the "Connect Wallet" label shown when disconnected. */
  connectLabel?: string;

  /**
   * Optional CSS class applied to the root `<div>` wrapper.
   * Use this to integrate with your own design system.
   */
  className?: string;
}

/**
 * `ConnectWalletButton` is a self-contained wallet connect/disconnect button.
 *
 * - When **disconnected**, it renders a "Connect Wallet" button.  If multiple
 *   adapters are registered it opens a small dropdown so the user can choose
 *   which wallet to use.
 * - When **connecting**, it shows a loading state.
 * - When **connected**, it displays the truncated wallet address and an option
 *   to disconnect.
 *
 * No direct wallet SDK imports are used here —
 * everything goes through {@link useWallet}.
 *
 * ### Usage
 * ```tsx
 * import { ConnectWalletButton } from "@mintcore/ui";
 *
 * function Header() {
 *   return (
 *     <header>
 *       <ConnectWalletButton />
 *     </header>
 *   );
 * }
 * ```
 */
export function ConnectWalletButton({
  connectLabel = "Connect Wallet",
  className,
}: ConnectWalletButtonProps): React.ReactElement {
  const { address, isConnected, connectionState, adapters, connect, disconnect } =
    useWallet();

  const [showPicker, setShowPicker] = useState(false);

  const handleConnectClick = useCallback(() => {
    if (adapters.length === 1) {
      // Only one adapter — connect immediately without a picker
      connect(adapters[0].name).catch(() => {
        // Error state is tracked by the provider; no additional handling needed
      });
    } else {
      setShowPicker((prev) => !prev);
    }
  }, [adapters, connect]);

  const handleAdapterSelect = useCallback(
    (adapterName: string) => {
      setShowPicker(false);
      connect(adapterName).catch(() => {
        // Error state is tracked by the provider
      });
    },
    [connect]
  );

  const handleDisconnect = useCallback(() => {
    disconnect().catch(() => {
      // Disconnect errors are non-critical
    });
  }, [disconnect]);

  // ── Connected state ──────────────────────────────────────────────────────────

  if (isConnected && address) {
    return (
      <div className={className} style={{ position: "relative", display: "inline-block" }}>
        <button
          type="button"
          title="Click to disconnect"
          onClick={handleDisconnect}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            cursor: "pointer",
            fontFamily: "monospace",
            fontSize: "14px",
          }}
        >
          {truncateAddress(address)}
        </button>
      </div>
    );
  }

  // ── Connecting state ─────────────────────────────────────────────────────────

  if (connectionState === "connecting") {
    return (
      <div className={className} style={{ display: "inline-block" }}>
        <button
          type="button"
          disabled
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            background: "#f1f5f9",
            cursor: "not-allowed",
            fontSize: "14px",
            opacity: 0.7,
          }}
        >
          Connecting…
        </button>
      </div>
    );
  }

  // ── Disconnected / error state ───────────────────────────────────────────────

  return (
    <div className={className} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={handleConnectClick}
        style={{
          padding: "8px 16px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          background: "#0f172a",
          color: "#f8fafc",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 500,
        }}
      >
        {connectLabel}
      </button>

      {/* Wallet picker dropdown — only shown when multiple adapters are registered */}
      {showPicker && adapters.length > 1 && (
        <div
          role="listbox"
          aria-label="Select wallet"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            minWidth: "160px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {adapters.map((adapter) => (
            <button
              key={adapter.name}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => handleAdapterSelect(adapter.name)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {adapter.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
