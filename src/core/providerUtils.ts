/**
 * Internal UTXO-provider utilities.
 *
 * These helpers are used by TransactionBuilder and BatchMintEngine to fetch
 * UTXOs and broadcast transactions via Chronik or ElectrumX/Fulcrum.
 * They are not part of the public API.
 */
import type { Utxo } from "../types/TransactionTypes.js";
import { MintCoreError } from "../utils/errors.js";
import { validateUtxo } from "../utils/validate.js";

function validateProviderUrl(url: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new MintCoreError(`Invalid ${name} provider URL`);
  }
  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !isLocal) {
    throw new MintCoreError(
      `${name} provider URL must use HTTPS (or localhost for development)`
    );
  }
  // Block RFC 1918 and link-local ranges to reduce SSRF risk.
  // 10.0.0.0/8 · 172.16.0.0/12 · 192.168.0.0/16 · 169.254.0.0/16
  if (!isLocal) {
    const h = parsed.hostname;
    const privateRange =
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^169\.254\.\d{1,3}\.\d{1,3}$/.test(h);
    if (privateRange) {
      throw new MintCoreError(
        `${name} provider URL must not target a private or link-local IP address`
      );
    }
  }
  return parsed.toString().replace(/\/+$/, "");
}

// ── Chronik ────────────────────────────────────────────────────────────────────

export async function chronikFetchUtxos(
  rawUrl: string,
  address: string
): Promise<Utxo[]> {
  const baseUrl = validateProviderUrl(rawUrl, "Chronik");
  try {
    const res = await fetch(`${baseUrl}/address/${address}/utxos`);
    if (!res.ok) {
      throw new MintCoreError(
        `Chronik UTXO request failed with status ${res.status}`
      );
    }
    const data = (await res.json()) as any;
    if (typeof data?.error === "string" && data.error.length > 0) {
      throw new MintCoreError(`Chronik error: ${data.error}`);
    }
    if (!Array.isArray(data?.utxos)) {
      throw new MintCoreError("Chronik returned malformed UTXO list");
    }
    const utxos: Utxo[] = (data.utxos as any[]).filter(validateUtxo);
    if (data.utxos.length > 0 && utxos.length === 0) {
      throw new MintCoreError(
        "Chronik returned UTXOs with an unrecognised schema"
      );
    }
    return utxos;
  } catch (err: any) {
    if (err instanceof MintCoreError) throw err;
    throw new MintCoreError(
      `Chronik UTXO fetch failed: ${err?.message ?? String(err)}`
    );
  }
}

export async function chronikBroadcast(
  rawUrl: string,
  txHex: string
): Promise<string> {
  const baseUrl = validateProviderUrl(rawUrl, "Chronik");
  try {
    const res = await fetch(`${baseUrl}/broadcast-txs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawTxs: [txHex] }),
    });
    if (!res.ok) {
      throw new MintCoreError(
        `Chronik broadcast failed with status ${res.status}`
      );
    }
    const data = (await res.json()) as any;
    const txid: string | undefined = data.txids?.[0] ?? data.txid;
    if (!txid) {
      throw new MintCoreError(
        "Chronik broadcast response did not contain a txid"
      );
    }
    return txid;
  } catch (err: any) {
    if (err instanceof MintCoreError) throw err;
    throw new MintCoreError(
      `Chronik broadcast failed: ${err?.message ?? String(err)}`
    );
  }
}

// ── ElectrumX / Fulcrum ────────────────────────────────────────────────────────

function electrumxBaseUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new MintCoreError("Invalid ElectrumX provider URL");
  }
  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !isLocal) {
    throw new MintCoreError(
      "ElectrumX provider URL must use HTTPS (or localhost for development)"
    );
  }
  // Block RFC 1918 and link-local ranges to reduce SSRF risk.
  if (!isLocal) {
    const h = parsed.hostname;
    const privateRange =
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
      /^169\.254\.\d{1,3}\.\d{1,3}$/.test(h);
    if (privateRange) {
      throw new MintCoreError(
        "ElectrumX provider URL must not target a private or link-local IP address"
      );
    }
  }
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

export async function electrumxFetchUtxos(
  rawUrl: string,
  address: string
): Promise<Utxo[]> {
  const baseUrl = electrumxBaseUrl(rawUrl);
  try {
    const res = await fetch(`${baseUrl}/address/${address}/unspent`);
    if (!res.ok) {
      throw new MintCoreError(
        `ElectrumX UTXO request failed with status ${res.status}`
      );
    }
    const data = (await res.json()) as any;
    if (typeof data?.error === "string" && data.error.length > 0) {
      throw new MintCoreError(`ElectrumX error: ${data.error}`);
    }
    const items: Array<{ tx_hash: string; tx_pos: number; value: number }> =
      Array.isArray(data?.result)
        ? data.result
        : Array.isArray(data)
        ? data
        : null;
    if (!items) {
      throw new MintCoreError("ElectrumX returned a malformed UTXO list");
    }
    const mapped: Utxo[] = items.map((item) => ({
      txid: item.tx_hash,
      vout: item.tx_pos,
      satoshis: item.value,
      scriptPubKey: "",
    }));
    const invalid = mapped.filter((u) => !validateUtxo(u));
    if (invalid.length > 0) {
      throw new MintCoreError(
        `ElectrumX returned ${invalid.length} UTXO(s) with an invalid schema`
      );
    }
    return mapped;
  } catch (err: any) {
    if (err instanceof MintCoreError) throw err;
    throw new MintCoreError(
      `ElectrumX UTXO fetch failed: ${err?.message ?? String(err)}`
    );
  }
}

export async function electrumxBroadcast(
  rawUrl: string,
  txHex: string
): Promise<string> {
  const baseUrl = electrumxBaseUrl(rawUrl);
  try {
    const res = await fetch(`${baseUrl}/tx/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawTx: txHex }),
    });
    if (!res.ok) {
      throw new MintCoreError(
        `ElectrumX broadcast failed with status ${res.status}`
      );
    }
    const data = (await res.json()) as any;
    if (typeof data === "string") return data;
    const txid: string | undefined = data.txid ?? data.result;
    if (!txid) {
      throw new MintCoreError(
        "ElectrumX broadcast response did not contain a txid"
      );
    }
    return txid;
  } catch (err: any) {
    if (err instanceof MintCoreError) throw err;
    throw new MintCoreError(
      `ElectrumX broadcast failed: ${err?.message ?? String(err)}`
    );
  }
}

// ── Dispatcher helpers ─────────────────────────────────────────────────────────

export async function fetchUtxos(
  config: { utxoProviderUrl?: string; electrumxProviderUrl?: string },
  address: string
): Promise<Utxo[]> {
  if (config.utxoProviderUrl) {
    return chronikFetchUtxos(config.utxoProviderUrl, address);
  }
  if (config.electrumxProviderUrl) {
    return electrumxFetchUtxos(config.electrumxProviderUrl, address);
  }
  throw new MintCoreError(
    "No UTXO provider configured. Set `utxoProviderUrl` or `electrumxProviderUrl` in MintConfig."
  );
}

export async function broadcastTransaction(
  config: { utxoProviderUrl?: string; electrumxProviderUrl?: string },
  txHex: string
): Promise<string> {
  if (config.utxoProviderUrl) {
    return chronikBroadcast(config.utxoProviderUrl, txHex);
  }
  if (config.electrumxProviderUrl) {
    return electrumxBroadcast(config.electrumxProviderUrl, txHex);
  }
  throw new MintCoreError(
    "No UTXO provider configured. Set `utxoProviderUrl` or `electrumxProviderUrl` in MintConfig."
  );
}
