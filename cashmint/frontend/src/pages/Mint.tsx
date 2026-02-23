import { MintForm } from "../components/MintForm.js";

export function Mint() {
  return (
    <div style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h1 style={{ fontSize: "1.75rem" }}>Mint a Token</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        Create a new CashToken on the Bitcoin Cash network.
        AI metadata generation coming soon.
      </p>
      <MintForm />
    </div>
  );
}
