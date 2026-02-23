import type { WalletInfo as WalletInfoType } from "../../shared/types.js";

interface WalletInfoProps {
  info: WalletInfoType;
}

export function WalletInfo({ info }: WalletInfoProps) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <h3>Wallet: {info.address}</h3>
      <p>BCH Balance: <strong>{info.bchBalance.toLocaleString()}</strong> satoshis</p>
      <div>
        <h4 style={{ marginBottom: "0.5rem" }}>Tokens ({info.tokens.length})</h4>
        {info.tokens.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>No tokens found.</p>
        ) : (
          <ul style={{ paddingLeft: "1.25rem" }}>
            {info.tokens.map((t) => (
              <li key={t.id}>{(t.metadata.name as string) ?? t.id} — {t.type}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <h4 style={{ marginBottom: "0.5rem" }}>UTXOs ({info.utxos.length})</h4>
        {info.utxos.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>No UTXOs found.</p>
        ) : (
          <ul style={{ paddingLeft: "1.25rem" }}>
            {info.utxos.map((u) => (
              <li key={`${u.txid}:${u.vout}`} style={{ fontSize: "0.85rem" }}>
                {u.txid.slice(0, 8)}…:{u.vout} — {u.satoshis} sats
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
