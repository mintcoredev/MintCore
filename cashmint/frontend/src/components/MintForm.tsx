import { useState } from "react";
import type { MintRequest, MintResponse } from "../../shared/types.js";
import { api } from "../services/api.service.js";

export function MintForm() {
  const [type, setType] = useState<"fungible" | "nft">("fungible");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [amount, setAmount] = useState<number>(1000);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MintResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const req: MintRequest = {
        type,
        metadata: { name, symbol },
        amount: type === "fungible" ? amount : undefined,
      };
      const res = await api.mintToken(req);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Minting failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "480px" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>Mint a Token</h2>

      <div style={{ display: "flex", gap: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input type="radio" value="fungible" checked={type === "fungible"} onChange={() => setType("fungible")} />
          Fungible
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <input type="radio" value="nft" checked={type === "nft"} onChange={() => setType("nft")} />
          NFT
        </label>
      </div>

      <input
        placeholder="Token name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        style={{ padding: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
      />
      <input
        placeholder="Symbol (e.g. BCH)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        required
        style={{ padding: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
      />
      {type === "fungible" && (
        <input
          type="number"
          placeholder="Initial supply"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min={1}
          style={{ padding: "0.5rem", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "4px", color: "var(--text-primary)" }}
        />
      )}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Minting…" : "Mint Token"}
      </button>

      {result && (
        <div style={{ background: "rgba(104,211,145,0.1)", border: "1px solid var(--success)", borderRadius: "6px", padding: "1rem" }}>
          <p style={{ color: "var(--success)", fontWeight: 600 }}>✓ Token minted!</p>
          <p style={{ fontSize: "0.8rem", wordBreak: "break-all", marginTop: "0.4rem" }}>
            ID: {result.tokenId}
          </p>
        </div>
      )}

      {error && (
        <div style={{ background: "rgba(252,129,129,0.1)", border: "1px solid var(--error)", borderRadius: "6px", padding: "1rem" }}>
          <p style={{ color: "var(--error)" }}>✗ {error}</p>
        </div>
      )}
    </form>
  );
}
