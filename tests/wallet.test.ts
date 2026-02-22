import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionBuilder } from "../src/core/TransactionBuilder.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { MintConfig } from "../src/types/MintConfig.js";
import type { WalletProvider } from "../src/types/WalletProvider.js";
import type { TokenSchema } from "../src/types/TokenSchema.js";
import { fromHex } from "../src/utils/hex.js";

// A valid regtest CashAddress derived from the well-known private key 0x01
const WALLET_ADDRESS = "bchreg:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";

const MOCK_UTXOS = [
  {
    tx_hash: "aa".repeat(32),
    tx_pos: 0,
    value: 500_000,
  },
];

/**
 * A minimal WalletProvider that returns the test address and echoes the
 * unsigned hex back as the "signed" hex (sufficient for structural tests).
 */
function makeWalletProvider(overrides?: Partial<WalletProvider>): WalletProvider {
  return {
    getAddress: vi.fn().mockResolvedValue(WALLET_ADDRESS),
    signTransaction: vi.fn().mockImplementation(async (txHex: string) => txHex),
    ...overrides,
  };
}

// ─── WalletProvider interface shape ───────────────────────────────────────────

describe("WalletProvider interface", () => {
  it("has getAddress and signTransaction methods", () => {
    const wallet = makeWalletProvider();
    expect(typeof wallet.getAddress).toBe("function");
    expect(typeof wallet.signTransaction).toBe("function");
  });
});

// ─── TransactionBuilder with wallet provider ──────────────────────────────────

describe("TransactionBuilder – wallet provider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a funded transaction using wallet address and wallet signing", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      walletProvider: wallet,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "Wallet Token",
      symbol: "WLT",
      decimals: 0,
      initialSupply: 100n,
    };

    const result = await builder.build(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(result.fee).toBeTypeOf("number");
    expect(result.fee!).toBeGreaterThan(0);
    expect(wallet.getAddress).toHaveBeenCalled();
    expect(wallet.signTransaction).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f]+$/),
      expect.arrayContaining([
        expect.objectContaining({ satoshis: expect.any(BigInt) }),
      ])
    );
  });

  it("calls getAddress to fetch UTXOs for the wallet address", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      walletProvider: wallet,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);

    await builder.build({
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
    });

    // getAddress is called at least once to resolve the UTXO fetch address
    expect(wallet.getAddress).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(WALLET_ADDRESS)
    );
  });

  it("falls back to offline build (no UTXO provider) with wallet provider", async () => {
    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      walletProvider: wallet,
      // no utxoProviderUrl / electrumxProviderUrl
    };
    const builder = new TransactionBuilder(config);

    const result = await builder.build({
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
    });

    // Offline builds still produce a valid hex+txid
    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
    // Wallet is NOT asked to sign in offline mode (no UTXOs to spend)
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("prefers privateKey over walletProvider when both are set", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
      walletProvider: wallet,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);

    const result = await builder.build({
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
    });

    // Transaction was built successfully using the private key
    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    // Wallet signTransaction should NOT have been called
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("throws MintCoreError when neither privateKey nor walletProvider is configured", async () => {
    const config: MintConfig = {
      network: "regtest",
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);

    await expect(
      builder.build({ name: "T", symbol: "T", decimals: 0, initialSupply: 1n })
    ).rejects.toThrow(MintCoreError);
    await expect(
      builder.build({ name: "T", symbol: "T", decimals: 0, initialSupply: 1n })
    ).rejects.toThrow(/signing credentials/i);
  });

  it("throws MintCoreError when no UTXOs are returned for the wallet address", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      walletProvider: wallet,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);

    await expect(
      builder.build({ name: "T", symbol: "T", decimals: 0, initialSupply: 1n })
    ).rejects.toThrow(MintCoreError);
  });

  it("passes sourceOutputs with correct satoshi values to signTransaction", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      walletProvider: wallet,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);

    await builder.build({
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
    });

    const callArgs = (wallet.signTransaction as any).mock.calls[0];
    const sourceOutputs: Array<{ satoshis: bigint; lockingBytecode: Uint8Array }> = callArgs[1];

    expect(sourceOutputs).toHaveLength(1);
    expect(sourceOutputs[0].satoshis).toBe(BigInt(MOCK_UTXOS[0].value));
    expect(sourceOutputs[0].lockingBytecode).toBeInstanceOf(Uint8Array);
  });

  it("includes BCMR OP_RETURN when bcmrUri is set (wallet mode)", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      walletProvider: wallet,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);

    const result = await builder.build({
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
      bcmrUri: "https://example.com/token.json",
    });

    // BCMR marker bytes (42 43 4d 52) must be present in the transaction
    expect(result.hex).toContain("42434d52");
  });
});
