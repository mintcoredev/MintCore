import { useEffect, useState } from "react";
import type { Token } from "../../shared/types.js";
import { api } from "../services/api.service.js";
import { TokenCard } from "../components/TokenCard.js";

const PAGE_SIZE = 12;

export function Tokens() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    api.getTokens().then(setTokens).catch(console.error);
  }, []);

  const paged = tokens.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(tokens.length / PAGE_SIZE);

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem" }}>All Tokens</h1>
      {tokens.length === 0 ? (
        <p style={{ color: "var(--text-secondary)" }}>No tokens have been minted yet.</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
            {paged.map((t) => (
              <TokenCard key={t.id} token={t} />
            ))}
          </div>
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button className="btn btn-secondary" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                ← Prev
              </button>
              <span style={{ color: "var(--text-secondary)" }}>
                Page {page + 1} / {totalPages}
              </span>
              <button className="btn btn-secondary" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
