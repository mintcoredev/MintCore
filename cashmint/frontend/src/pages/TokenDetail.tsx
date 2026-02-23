import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { Token, ValidationResult } from "../../shared/types.js";
import { api } from "../services/api.service.js";

export function TokenDetail() {
  const { id } = useParams<{ id: string }>();
  const [token, setToken] = useState<Token | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getToken(id)
      .then(setToken)
      .catch((err: Error) => setError(err.message));
    api.validateToken(id)
      .then(setValidation)
      .catch(console.error);
  }, [id]);

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <p style={{ color: "var(--error)" }}>{error}</p>
        <Link to="/tokens">← Back to Tokens</Link>
      </div>
    );
  }

  if (!token) {
    return <div style={{ padding: "2rem" }}>Loading…</div>;
  }

  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "720px" }}>
      <Link to="/tokens" style={{ fontSize: "0.9rem" }}>← Back to Tokens</Link>
      <h1 style={{ fontSize: "1.75rem" }}>{(token.metadata.name as string) ?? token.id}</h1>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Metadata</h2>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          {JSON.stringify(token.metadata, null, 2)}
        </pre>
      </div>

      {validation && (
        <div
          className="card"
          style={{ borderColor: validation.valid ? "var(--success)" : "var(--error)" }}
        >
          <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Validation Status</h2>
          <p style={{ color: validation.valid ? "var(--success)" : "var(--error)" }}>
            {validation.valid ? "✓ Valid" : "✗ Invalid"} — {validation.message}
          </p>
        </div>
      )}

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Raw Transaction</h2>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          {token.rawTx}
        </pre>
      </div>
    </div>
  );
}
