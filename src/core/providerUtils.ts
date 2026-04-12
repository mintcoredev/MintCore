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

/**
 * Returns `true` when `hostname` resolves to a private, loopback, or
 * link-local address — for both IPv4 and IPv6 — to protect against SSRF.
 *
 * IPv4 ranges blocked:
 *   10.0.0.0/8 · 172.16.0.0/12 · 192.168.0.0/16 · 169.254.0.0/16
 *
 * IPv6 ranges blocked (in addition to the loopback ::1 handled by isLocal):
 *   fc00::/7  (unique-local: fc** and fd**)
 *   fe80::/10 (link-local:   fe8* – feb*)
 *   ::ffff:0:0/96 (IPv4-mapped – blocks e.g. ::ffff:10.0.0.1)
 *   64:ff9b::/96  (IPv4/IPv6 translation prefix)
 */
function isPrivateHost(hostname: string): boolean {
  // IPv4 private / link-local ranges
  if (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^169\.254\.\d{1,3}\.\d{1,3}$/.test(hostname)
  ) {
    return true;
  }
  // IPv6 literal addresses are enclosed in brackets by the URL parser.
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    const addr = hostname.slice(1, -1).toLowerCase();
    // Unique-local fc00::/7 (fc** and fd**)
    if (/^f[cd]/i.test(addr)) return true;
    // Link-local fe80::/10 (fe80 – febf, i.e. fe8* – feb*)
    if (/^fe[89ab]/i.test(addr)) return true;
    // IPv4-mapped ::ffff:x.x.x.x / ::ffff:hex:hex
    if (addr.startsWith("::ffff:")) return true;
    // IPv4/IPv6 translation 64:ff9b::/96
    if (addr.startsWith("64:ff9b:")) return true;
  }
  return false;
}

/**
 * Shared URL safety assertion used by both Chronik and ElectrumX helpers.
 *
 * Enforces:
 *  1. URL must be parseable.
 *  2. HTTPS is required unless the host is localhost / 127.0.0.1 / [::1].
 *  3. Private, link-local, and IPv6 loopback/ULA hosts are blocked (SSRF).
 */
function assertProviderUrlSafe(parsed: URL, name: string): void {
  const h = parsed.hostname.toLowerCase();
  const isLocal =
    h === "localhost" || h === "127.0.0.1" || h === "[::1]";

  if (parsed.protocol !== "https:" && !isLocal) {
    throw new MintCoreError(
      `${name} provider URL must use HTTPS (or localhost for development)`
    );
  }
  if (!isLocal && isPrivateHost(h)) {
    throw new MintCoreError(
      `${name} provider URL must not target a private or link-local IP address`
    );
  }
}

function validateProviderUrl(url: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new MintCoreError(`Invalid ${name} provider URL`);
  }
  assertProviderUrlSafe(parsed, name);
  return parsed.toString().replace(/\/+$/, "");
}

// ── Chronik ────────────────────────────────────────────────────────────────────

export async function chronikFetchUtxos(
  rawUrl: string,
  address: string
): Promise<Utxo[]> {
  const baseUrl = validateProviderUrl(rawUrl, "Chronik");
  try {
    const res = await fetch(`${baseUrl}/address/${encodeURIComponent(address)}/utxos`);
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
  assertProviderUrlSafe(parsed, "ElectrumX");
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

export async function electrumxFetchUtxos(
  rawUrl: string,
  address: string
): Promise<Utxo[]> {
  const baseUrl = electrumxBaseUrl(rawUrl);
  try {
    const res = await fetch(`${baseUrl}/address/${encodeURIComponent(address)}/unspent`);
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
