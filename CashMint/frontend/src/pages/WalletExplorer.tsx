import { useState } from "react";
import type { WalletInfo as WalletInfoType } from "../../shared/types.js";
import { api } from "../services/api.service.js";
import { WalletInfo } from "../components/WalletInfo.js";

export function WalletExplorer() {
  const [address, setAddress] = useState("");
  const [wallet, setWallet] = useState<WalletInfoType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setWallet(null);
    try {
      const info = await api.getWallet(address.trim());
      setWallet(info);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch wallet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "720px" }}>
      <h1 style={{ fontSize: "1.75rem" }}>Wallet Explorer</h1>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem" }}>
        <input
          placeholder="Bitcoin Cash address (e.g. bitcoincash:q...)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ flex: 1, padding: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p style={{ color: "var(--error)" }}>✗ {error}</p>}
      {wallet && <WalletInfo info={wallet} />}
    </div>
  );
}
