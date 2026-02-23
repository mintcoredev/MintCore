import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { HealthStatus, Token } from "../../shared/types.js";
import { api } from "../services/api.service.js";
import { TokenCard } from "../components/TokenCard.js";

export function Dashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(console.error);
    api.getTokens().then(setTokens).catch(console.error);
  }, []);

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <h1 style={{ fontSize: "1.75rem" }}>Dashboard</h1>

      {health && (
        <div
          className="card"
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            borderColor: health.status === "ok" ? "var(--success)" : "var(--error)",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>{health.status === "ok" ? "✅" : "❌"}</span>
          <div>
            <p style={{ fontWeight: 600 }}>MintCore v{health.mintcoreVersion}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              {health.timestamp}
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem" }}>
        <Link to="/mint" className="btn btn-primary" style={{ display: "inline-block" }}>
          + Mint Token
        </Link>
        <Link to="/tokens" className="btn btn-secondary" style={{ display: "inline-block" }}>
          View All Tokens
        </Link>
      </div>

      <div>
        <h2 style={{ marginBottom: "1rem" }}>Recent Tokens</h2>
        {tokens.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>No tokens minted yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {tokens.slice(-6).map((t) => (
              <TokenCard key={t.id} token={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
