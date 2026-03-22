import { describe, it, expect, vi } from "vitest";
import {
  WizardConnectProvider,
  type WizardConnectProviderOptions,
} from "../src/providers/WizardConnectProvider.js";
import type { WizardConnectClientLike } from "../src/wallet/WalletClient.js";
import { MintCoreError } from "../src/utils/errors.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const MAINNET_ADDRESS = "bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";
const REGTEST_ADDRESS = "bchreg:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";
const SIGNED_TX_HEX = "deadbeef";
const UNSIGNED_TX_HEX = "cafebabe";

function makeClient(overrides?: {
  getAccountsImpl?: () => Promise<string[]>;
  signTransactionImpl?: (txHex: string, outputs: Array<{ satoshis: string; lockingBytecode: string }>) => Promise<string>;
}): WizardConnectClientLike {
  return {
    getAccounts: vi.fn().mockImplementation(
      overrides?.getAccountsImpl ?? (async () => [MAINNET_ADDRESS])
    ),
    signTransaction: vi.fn().mockImplementation(
      overrides?.signTransactionImpl ?? (async () => SIGNED_TX_HEX)
    ),
    disconnect: vi.fn().mockResolvedValue(undefined),
  };
}

function makeProvider(
  opts?: Partial<WizardConnectProviderOptions>
): WizardConnectProvider {
  return new WizardConnectProvider({
    client: makeClient(),
    ...opts,
  });
}

// ─── constructor validation ───────────────────────────────────────────────────

describe("WizardConnectProvider constructor", () => {
  it("throws when client is missing", () => {
    expect(
      () =>
        new WizardConnectProvider({
          client: null as unknown as WizardConnectClientLike,
        })
    ).toThrow(MintCoreError);
  });

  it("constructs successfully with a valid client", () => {
    expect(() => makeProvider()).not.toThrow();
  });
});

// ─── getAddress ───────────────────────────────────────────────────────────────

describe("WizardConnectProvider.getAddress", () => {
  it("returns address from constructor options without a getAccounts call", async () => {
    const client = makeClient();
    const provider = new WizardConnectProvider({
      client,
      address: MAINNET_ADDRESS,
    });

    const addr = await provider.getAddress();

    expect(addr).toBe(MAINNET_ADDRESS);
    expect(client.getAccounts).not.toHaveBeenCalled();
  });

  it("calls getAccounts and returns the address", async () => {
    const client = makeClient({
      getAccountsImpl: async () => [MAINNET_ADDRESS],
    });
    const provider = new WizardConnectProvider({ client });

    const addr = await provider.getAddress();

    expect(addr).toBe(MAINNET_ADDRESS);
    expect(client.getAccounts).toHaveBeenCalled();
  });

  it("returns a regtest address when the wallet returns one", async () => {
    const client = makeClient({ getAccountsImpl: async () => [REGTEST_ADDRESS] });
    const provider = new WizardConnectProvider({ client });

    const addr = await provider.getAddress();

    expect(addr).toBe(REGTEST_ADDRESS);
  });

  it("caches the address after the first call", async () => {
    const client = makeClient({ getAccountsImpl: async () => [MAINNET_ADDRESS] });
    const provider = new WizardConnectProvider({ client });

    await provider.getAddress();
    await provider.getAddress();

    expect(client.getAccounts).toHaveBeenCalledTimes(1);
  });

  it("throws MintCoreError when getAccounts returns empty array", async () => {
    const client = makeClient({ getAccountsImpl: async () => [] });
    const provider = new WizardConnectProvider({ client });

    await expect(provider.getAddress()).rejects.toThrow(MintCoreError);
    await expect(provider.getAddress()).rejects.toThrow(/no accounts/i);
  });

  it("throws MintCoreError when getAccounts returns a non-array", async () => {
    const client = makeClient({
      getAccountsImpl: async () => null as unknown as string[],
    });
    const provider = new WizardConnectProvider({ client });

    await expect(provider.getAddress()).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when the getAccounts call rejects", async () => {
    const client = makeClient({
      getAccountsImpl: async () => {
        throw new Error("connection lost");
      },
    });
    const provider = new WizardConnectProvider({ client });

    await expect(provider.getAddress()).rejects.toThrow(MintCoreError);
    await expect(provider.getAddress()).rejects.toThrow(/connection lost/i);
  });
});

// ─── signTransaction ──────────────────────────────────────────────────────────

describe("WizardConnectProvider.signTransaction", () => {
  const SOURCE_OUTPUTS = [
    {
      satoshis: 100_000n,
      lockingBytecode: new Uint8Array([0x76, 0xa9, 0x14]),
    },
  ] as const;

  it("calls signTransaction and returns signed hex", async () => {
    const client = makeClient({
      signTransactionImpl: async () => SIGNED_TX_HEX,
    });
    const provider = makeProvider({ client });

    const result = await provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    expect(result).toBe(SIGNED_TX_HEX);
    expect(client.signTransaction).toHaveBeenCalledWith(
      UNSIGNED_TX_HEX,
      expect.arrayContaining([
        expect.objectContaining({ satoshis: "100000", lockingBytecode: "76a914" }),
      ])
    );
  });

  it("serialises satoshis as a string in the call params", async () => {
    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const provider = makeProvider({ client });

    await provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    const call = (client.signTransaction as ReturnType<typeof vi.fn>).mock.calls[0];
    const outputs = call[1] as Array<{ satoshis: string; lockingBytecode: string }>;

    expect(typeof outputs[0].satoshis).toBe("string");
    expect(outputs[0].satoshis).toBe("100000");
  });

  it("serialises lockingBytecode as a lowercase hex string in the call params", async () => {
    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const provider = makeProvider({ client });

    await provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    const call = (client.signTransaction as ReturnType<typeof vi.fn>).mock.calls[0];
    const outputs = call[1] as Array<{ lockingBytecode: string }>;

    expect(outputs[0].lockingBytecode).toBe("76a914");
  });

  it("throws MintCoreError when the wallet returns an empty string", async () => {
    const client = makeClient({ signTransactionImpl: async () => "" });
    const provider = makeProvider({ client });

    await expect(
      provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)
    ).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when the wallet returns a non-string value", async () => {
    const client = makeClient({
      signTransactionImpl: async () => 42 as unknown as string,
    });
    const provider = makeProvider({ client });

    await expect(
      provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)
    ).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when the signTransaction call rejects", async () => {
    const client = makeClient({
      signTransactionImpl: async () => {
        throw new Error("user rejected");
      },
    });
    const provider = makeProvider({ client });

    await expect(
      provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)
    ).rejects.toThrow(MintCoreError);
    await expect(
      provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)
    ).rejects.toThrow(/user rejected/i);
  });

  it("handles multiple source outputs correctly", async () => {
    const multiOutputs = [
      { satoshis: 200_000n, lockingBytecode: new Uint8Array([0xab, 0xcd]) },
      { satoshis: 50_000n, lockingBytecode: new Uint8Array([0xef]) },
    ] as const;

    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const provider = makeProvider({ client });

    await provider.signTransaction(UNSIGNED_TX_HEX, multiOutputs);

    const call = (client.signTransaction as ReturnType<typeof vi.fn>).mock.calls[0];
    const outputs = call[1] as Array<{ satoshis: string; lockingBytecode: string }>;

    expect(outputs).toHaveLength(2);
    expect(outputs[0]).toEqual({ satoshis: "200000", lockingBytecode: "abcd" });
    expect(outputs[1]).toEqual({ satoshis: "50000", lockingBytecode: "ef" });
  });
});

// ─── WalletProvider interface compliance ──────────────────────────────────────

describe("WizardConnectProvider satisfies WalletProvider interface", () => {
  it("exposes getAddress and signTransaction methods", () => {
    const provider = makeProvider();
    expect(typeof provider.getAddress).toBe("function");
    expect(typeof provider.signTransaction).toBe("function");
  });
});
