import type { Token } from "../../shared/types.js";
import { Link } from "react-router-dom";

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  const name = (token.metadata.name as string) ?? token.id;
  const symbol = (token.metadata.symbol as string) ?? "";

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: "1.05rem" }}>{name}</span>
        <span className={`badge badge-${token.type}`}>{token.type.toUpperCase()}</span>
      </div>
      {symbol && <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{symbol}</span>}
      {token.amount !== undefined && (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
          Supply: {token.amount.toLocaleString()}
        </span>
      )}
      <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
        Created: {new Date(token.createdAt).toLocaleDateString()}
      </span>
      <Link to={`/tokens/${token.id}`} style={{ fontSize: "0.85rem" }}>
        View details →
      </Link>
    </div>
  );
}
