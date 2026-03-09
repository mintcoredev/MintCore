import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChronikProvider } from "../src/providers/ChronikProvider.js";
import { MintCoreError } from "../src/utils/errors.js";

const BASE_URL = "https://chronik.example.com";
const TEST_ADDRESS = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";

describe("ChronikProvider constructor URL validation", () => {
  it("accepts a valid HTTPS URL", () => {
    expect(() => new ChronikProvider("https://chronik.example.com", "mainnet")).not.toThrow();
  });

  it("accepts localhost with http for development", () => {
    expect(() => new ChronikProvider("http://localhost:8080", "regtest")).not.toThrow();
  });

  it("accepts 127.0.0.1 with http for development", () => {
    expect(() => new ChronikProvider("http://127.0.0.1:3000", "regtest")).not.toThrow();
  });

  it("throws MintCoreError for a malformed URL", () => {
    expect(() => new ChronikProvider("not-a-url", "mainnet")).toThrow(MintCoreError);
    expect(() => new ChronikProvider("not-a-url", "mainnet")).toThrow("Invalid Chronik provider URL");
  });

  it("throws MintCoreError for an http URL on a non-local host", () => {
    expect(() => new ChronikProvider("http://chronik.example.com", "mainnet")).toThrow(MintCoreError);
    expect(() => new ChronikProvider("http://chronik.example.com", "mainnet")).toThrow("HTTPS");
  });

  it("throws MintCoreError for a file:// URL", () => {
    expect(() => new ChronikProvider("file:///tmp/test.txt", "mainnet")).toThrow(MintCoreError);
    expect(() => new ChronikProvider("file:///tmp/test.txt", "mainnet")).toThrow("HTTPS");
  });

});

describe("ChronikProvider.fetchUtxos", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns mapped UTXOs from a { utxos: [...] } wrapped response", async () => {
    const inner = [
      { txid: "bb".repeat(32), vout: 0, satoshis: 50000, scriptPubKey: "" },
    ];
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ utxos: inner }),
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toHaveLength(1);
  });

  it("returns an empty array when response is { utxos: [] }", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ utxos: [] }),
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toHaveLength(0);
  });

  it("throws MintCoreError when response is a bare array (not { utxos: [...] })", async () => {
    const mockData = [
      { txid: "aa".repeat(32), vout: 0, satoshis: 100000, scriptPubKey: "" },
    ];
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("malformed UTXO list");
  });

  it("throws MintCoreError when response contains an error field", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ error: "backend offline" }),
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("backend offline");
  });

  it("throws MintCoreError when response has utxos: null", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ utxos: null }),
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("malformed UTXO list");
  });

  it("throws MintCoreError when response is an empty object {}", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("malformed UTXO list");
  });

  it("throws MintCoreError when response is not an object", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => "unexpected string",
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("invalid response");
  });

  it("throws MintCoreError on a non-OK HTTP response", async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 503 });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("503");
  });

  it("throws MintCoreError when fetch rejects (network error)", async () => {
    (fetch as any).mockRejectedValue(new Error("Network timeout"));

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("Network timeout");
  });

  it("builds the correct UTXO URL from the base URL", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ utxos: [] }),
    });

    const provider = new ChronikProvider("https://chronik.example.com/", "mainnet");
    await provider.fetchUtxos(TEST_ADDRESS);

    expect(fetch).toHaveBeenCalledWith(
      `https://chronik.example.com/address/${TEST_ADDRESS}/utxos`
    );
  });

  it("strips trailing slashes from the base URL", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ utxos: [] }),
    });

    const provider = new ChronikProvider("https://chronik.example.com///", "testnet");
    await provider.fetchUtxos(TEST_ADDRESS);

    expect(fetch).toHaveBeenCalledWith(
      `https://chronik.example.com/address/${TEST_ADDRESS}/utxos`
    );
  });
});
