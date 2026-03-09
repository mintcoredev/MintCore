/**
 * tests/integration/signing/wallet-provider.test.ts
 *
 * Integration tests for the WalletProvider signing path:
 *  - getAddress() is called to derive the UTXO-fetch address
 *  - signTransaction() receives the unsigned hex and source outputs
 *  - The result txid is derived from the signed transaction
 *  - Wallet signing is skipped in offline mode (no UTXO provider)
 *  - Network prefix mismatch on the wallet address is rejected
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionBuilder } from "../../../src/core/TransactionBuilder.js";
import { MintCoreError } from "../../../src/utils/errors.js";
import type { MintConfig } from "../../../src/types/MintConfig.js";
import type { WalletProvider } from "../../../src/types/WalletProvider.js";
import type { TokenSchema } from "../../../src/types/TokenSchema.js";

// Regtest CashAddress derived from private key 0x01
const WALLET_ADDRESS = "bchreg:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";

const MOCK_UTXOS = [
  { tx_hash: "aa".repeat(32), tx_pos: 0, value: 500_000 },
];

function makeWalletProvider(overrides?: Partial<WalletProvider>): WalletProvider {
  return {
    getAddress: vi.fn().mockResolvedValue(WALLET_ADDRESS),
    // Echo the unsigned hex back as "signed" — sufficient for structural tests
    signTransaction: vi.fn().mockImplementation(async (txHex: string) => txHex),
    ...overrides,
  };
}

const schema: TokenSchema = {
  name: "Wallet Token",
  symbol: "WLT",
  decimals: 0,
  initialSupply: 100n,
};

describe("WalletProvider signing path", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls getAddress to resolve the UTXO-fetch address", async () => {
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

    await builder.build(schema);

    expect(wallet.getAddress).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(WALLET_ADDRESS)
    );
  });

  it("calls signTransaction with the unsigned hex and source outputs", async () => {
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

    await builder.build(schema);

    expect(wallet.signTransaction).toHaveBeenCalledWith(
      expect.stringMatching(/^[0-9a-f]+$/),
      expect.arrayContaining([
        expect.objectContaining({
          satoshis: expect.any(BigInt),
          lockingBytecode: expect.any(Uint8Array),
        }),
      ])
    );
  });

  it("returns a valid txid from the signed transaction hex", async () => {
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
    const tx = await builder.build(schema);

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(tx.fee).toBeTypeOf("number");
    expect(tx.fee!).toBeGreaterThan(0);
  });

  it("does not call signTransaction in offline mode (no UTXO provider)", async () => {
    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      walletProvider: wallet,
      // No utxoProviderUrl / electrumxProviderUrl → offline mode
    };
    const builder = new TransactionBuilder(config);

    const tx = await builder.build(schema);

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("prefers privateKey signing over walletProvider when both are configured", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const wallet = makeWalletProvider();
    const config: MintConfig = {
      network: "regtest",
      privateKey:
        "0000000000000000000000000000000000000000000000000000000000000001",
      walletProvider: wallet,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);

    const tx = await builder.build(schema);

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    // Wallet should NOT have been asked to sign when a private key is present
    expect(wallet.signTransaction).not.toHaveBeenCalled();
  });

  it("passes source outputs with correct satoshi values to signTransaction", async () => {
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

    await builder.build(schema);

    const callArgs = (wallet.signTransaction as ReturnType<typeof vi.fn>).mock.calls[0];
    const sourceOutputs = callArgs[1] as Array<{ satoshis: bigint; lockingBytecode: Uint8Array }>;

    expect(sourceOutputs).toHaveLength(1);
    expect(sourceOutputs[0].satoshis).toBe(BigInt(MOCK_UTXOS[0].value));
    expect(sourceOutputs[0].lockingBytecode).toBeInstanceOf(Uint8Array);
  });

  it("rejects a wallet address whose network prefix does not match the config", async () => {
    // A valid mainnet address (correct checksum for "bitcoincash:" prefix) used against
    // a regtest-configured builder should trigger a network mismatch error.
    const mainnetAddress = "bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6cy4spdc2h";
    const wallet = makeWalletProvider({
      getAddress: vi.fn().mockResolvedValue(mainnetAddress),
    });

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const config: MintConfig = {
      network: "regtest", // expects "bchreg:" prefix
      walletProvider: wallet,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);

    await expect(builder.build(schema)).rejects.toThrow(MintCoreError);
    await expect(builder.build(schema)).rejects.toThrow(/network mismatch/i);
  });
});
