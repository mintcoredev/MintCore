import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChronikProvider } from "../src/providers/ChronikProvider.js";
import { ElectrumXProvider } from "../src/providers/ElectrumXProvider.js";
import { TransactionBuilder } from "../src/core/TransactionBuilder.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { MintConfig } from "../src/types/MintConfig.js";

const SIGNED_TX_HEX = "0200000001" + "aa".repeat(32) + "00000000ffffffff01" + "e803000000000000" + "1976a914" + "bb".repeat(20) + "88ac00000000";

// ─── ChronikProvider.broadcastTransaction ─────────────────────────────────────

describe("ChronikProvider.broadcastTransaction", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("broadcasts a transaction and returns the txid", async () => {
    const expectedTxid = "cc".repeat(32);
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txids: [expectedTxid] }),
    });

    const provider = new ChronikProvider("https://chronik.example.com", "mainnet");
    const txid = await provider.broadcastTransaction(SIGNED_TX_HEX);

    expect(txid).toBe(expectedTxid);
  });

  it("posts to the correct broadcast endpoint", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txids: ["dd".repeat(32)] }),
    });

    const provider = new ChronikProvider("https://chronik.example.com/", "mainnet");
    await provider.broadcastTransaction(SIGNED_TX_HEX);

    expect(fetch).toHaveBeenCalledWith(
      "https://chronik.example.com/broadcast-txs",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawTxs: [SIGNED_TX_HEX] }),
      })
    );
  });

  it("throws MintCoreError on a non-OK HTTP response", async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 500 });

    const provider = new ChronikProvider("https://chronik.example.com", "mainnet");
    await expect(provider.broadcastTransaction(SIGNED_TX_HEX)).rejects.toThrow(MintCoreError);
    await expect(provider.broadcastTransaction(SIGNED_TX_HEX)).rejects.toThrow("500");
  });

  it("throws MintCoreError when fetch rejects (network error)", async () => {
    (fetch as any).mockRejectedValue(new Error("Connection refused"));

    const provider = new ChronikProvider("https://chronik.example.com", "mainnet");
    await expect(provider.broadcastTransaction(SIGNED_TX_HEX)).rejects.toThrow(MintCoreError);
    await expect(provider.broadcastTransaction(SIGNED_TX_HEX)).rejects.toThrow("Connection refused");
  });
});

// ─── ElectrumXProvider.broadcastTransaction ───────────────────────────────────

describe("ElectrumXProvider.broadcastTransaction", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("broadcasts a transaction and returns the txid from { txid } response", async () => {
    const expectedTxid = "ee".repeat(32);
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txid: expectedTxid }),
    });

    const provider = new ElectrumXProvider("https://fulcrum.example.com", "mainnet");
    const txid = await provider.broadcastTransaction(SIGNED_TX_HEX);

    expect(txid).toBe(expectedTxid);
  });

  it("broadcasts a transaction and returns the txid from { result } response", async () => {
    const expectedTxid = "ff".repeat(32);
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: expectedTxid }),
    });

    const provider = new ElectrumXProvider("https://fulcrum.example.com", "mainnet");
    const txid = await provider.broadcastTransaction(SIGNED_TX_HEX);

    expect(txid).toBe(expectedTxid);
  });

  it("broadcasts a transaction and returns a plain-string txid", async () => {
    const expectedTxid = "aa".repeat(32);
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => expectedTxid,
    });

    const provider = new ElectrumXProvider("https://fulcrum.example.com", "mainnet");
    const txid = await provider.broadcastTransaction(SIGNED_TX_HEX);

    expect(txid).toBe(expectedTxid);
  });

  it("posts to the correct broadcast endpoint", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txid: "11".repeat(32) }),
    });

    const provider = new ElectrumXProvider("https://fulcrum.example.com/", "mainnet");
    await provider.broadcastTransaction(SIGNED_TX_HEX);

    expect(fetch).toHaveBeenCalledWith(
      "https://fulcrum.example.com/tx/broadcast",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawTx: SIGNED_TX_HEX }),
      })
    );
  });

  it("throws MintCoreError on a non-OK HTTP response", async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 404 });

    const provider = new ElectrumXProvider("https://fulcrum.example.com", "mainnet");
    await expect(provider.broadcastTransaction(SIGNED_TX_HEX)).rejects.toThrow(MintCoreError);
    await expect(provider.broadcastTransaction(SIGNED_TX_HEX)).rejects.toThrow("404");
  });

  it("throws MintCoreError when fetch rejects (network error)", async () => {
    (fetch as any).mockRejectedValue(new Error("Timeout"));

    const provider = new ElectrumXProvider("https://fulcrum.example.com", "mainnet");
    await expect(provider.broadcastTransaction(SIGNED_TX_HEX)).rejects.toThrow(MintCoreError);
    await expect(provider.broadcastTransaction(SIGNED_TX_HEX)).rejects.toThrow("Timeout");
  });
});

// ─── TransactionBuilder.broadcast ─────────────────────────────────────────────

describe("TransactionBuilder.broadcast", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delegates to the ElectrumX provider and returns the txid", async () => {
    const expectedTxid = "22".repeat(32);
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txid: expectedTxid }),
    });

    const config: MintConfig = {
      network: "regtest",
      privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);
    const txid = await builder.broadcast(SIGNED_TX_HEX);

    expect(txid).toBe(expectedTxid);
  });

  it("delegates to the Chronik provider and returns the txid", async () => {
    const expectedTxid = "33".repeat(32);
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ txids: [expectedTxid] }),
    });

    const config: MintConfig = {
      network: "regtest",
      privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
      utxoProviderUrl: "https://chronik.example.com",
    };
    const builder = new TransactionBuilder(config);
    const txid = await builder.broadcast(SIGNED_TX_HEX);

    expect(txid).toBe(expectedTxid);
  });

  it("throws MintCoreError when no provider is configured", async () => {
    const config: MintConfig = {
      network: "regtest",
      privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
    };
    const builder = new TransactionBuilder(config);
    await expect(builder.broadcast(SIGNED_TX_HEX)).rejects.toThrow(MintCoreError);
    await expect(builder.broadcast(SIGNED_TX_HEX)).rejects.toThrow(/provider/i);
  });
});
