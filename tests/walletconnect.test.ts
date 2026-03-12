import { describe, it, expect, vi } from "vitest";
import {
  WalletConnectProvider,
  type WalletConnectClientLike,
  type WalletConnectProviderOptions,
} from "../src/providers/WalletConnectProvider.js";
import { MintCoreError } from "../src/utils/errors.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

const MAINNET_ADDRESS = "bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";
const REGTEST_ADDRESS = "bchreg:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";
const SIGNED_TX_HEX = "deadbeef";
const UNSIGNED_TX_HEX = "cafebabe";

function makeClient(overrides?: {
  requestImpl?: (args: Parameters<WalletConnectClientLike["request"]>[0]) => Promise<unknown>;
}): WalletConnectClientLike {
  return {
    request: vi.fn().mockImplementation(
      overrides?.requestImpl ?? (async () => [MAINNET_ADDRESS])
    ),
  };
}

function makeProvider(
  opts?: Partial<WalletConnectProviderOptions>
): WalletConnectProvider {
  return new WalletConnectProvider({
    client: makeClient(),
    topic: "test-topic",
    network: "mainnet",
    ...opts,
  });
}

// ─── WalletConnectProvider.networkToChainId ───────────────────────────────────

describe("WalletConnectProvider.networkToChainId", () => {
  it("maps mainnet to bch:mainnet", () => {
    expect(WalletConnectProvider.networkToChainId("mainnet")).toBe("bch:mainnet");
  });

  it("maps testnet to bch:testnet", () => {
    expect(WalletConnectProvider.networkToChainId("testnet")).toBe("bch:testnet");
  });

  it("maps regtest to bch:regtest", () => {
    expect(WalletConnectProvider.networkToChainId("regtest")).toBe("bch:regtest");
  });
});

// ─── constructor validation ───────────────────────────────────────────────────

describe("WalletConnectProvider constructor", () => {
  it("throws when client is missing", () => {
    expect(
      () =>
        new WalletConnectProvider({
          client: null as unknown as WalletConnectClientLike,
          topic: "test-topic",
        })
    ).toThrow(MintCoreError);
  });

  it("throws when topic is empty string", () => {
    expect(
      () =>
        new WalletConnectProvider({
          client: makeClient(),
          topic: "  ",
        })
    ).toThrow(MintCoreError);
  });

  it("uses bch:mainnet chainId by default", () => {
    const provider = makeProvider();
    // Accessing private field via bracket notation for test inspection only
    expect((provider as any).chainId).toBe("bch:mainnet");
  });

  it("respects explicit chainId override", () => {
    const provider = makeProvider({ chainId: "bch:bitcoincash" });
    expect((provider as any).chainId).toBe("bch:bitcoincash");
  });

  it("derives regtest chainId from network option", () => {
    const provider = makeProvider({ network: "regtest" });
    expect((provider as any).chainId).toBe("bch:regtest");
  });
});

// ─── getAddress ───────────────────────────────────────────────────────────────

describe("WalletConnectProvider.getAddress", () => {
  it("returns address from constructor options without an RPC call", async () => {
    const client = makeClient();
    const provider = new WalletConnectProvider({
      client,
      topic: "t",
      address: MAINNET_ADDRESS,
    });

    const addr = await provider.getAddress();

    expect(addr).toBe(MAINNET_ADDRESS);
    expect(client.request).not.toHaveBeenCalled();
  });

  it("calls bch_getAccounts and returns the address", async () => {
    const client = makeClient({
      requestImpl: async () => [MAINNET_ADDRESS],
    });
    const provider = new WalletConnectProvider({ client, topic: "t" });

    const addr = await provider.getAddress();

    expect(addr).toBe(MAINNET_ADDRESS);
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "t",
        request: expect.objectContaining({ method: "bch_getAccounts" }),
      })
    );
  });

  it("strips CAIP-10 namespace prefix and returns the CashAddr", async () => {
    // CAIP-10 for BCH: "bch:<chain>:<cashaddr_prefix>:<payload>"
    // e.g. "bch:mainnet:bitcoincash:qp63uah..." → "bitcoincash:qp63uah..."
    const caip10 = `bch:mainnet:${MAINNET_ADDRESS}`;
    const client = makeClient({ requestImpl: async () => [caip10] });
    const provider = new WalletConnectProvider({ client, topic: "t" });

    const addr = await provider.getAddress();

    // The last two colon-separated segments reconstruct the CashAddr
    expect(addr).toBe(MAINNET_ADDRESS);
  });

  it("caches the address after the first RPC call", async () => {
    const client = makeClient({ requestImpl: async () => [MAINNET_ADDRESS] });
    const provider = new WalletConnectProvider({ client, topic: "t" });

    await provider.getAddress();
    await provider.getAddress();

    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it("sends the correct chainId in the request", async () => {
    const client = makeClient({ requestImpl: async () => [REGTEST_ADDRESS] });
    const provider = new WalletConnectProvider({
      client,
      topic: "t",
      network: "regtest",
    });

    await provider.getAddress();

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: "bch:regtest" })
    );
  });

  it("throws MintCoreError when bch_getAccounts returns empty array", async () => {
    const client = makeClient({ requestImpl: async () => [] });
    const provider = new WalletConnectProvider({ client, topic: "t" });

    await expect(provider.getAddress()).rejects.toThrow(MintCoreError);
    await expect(provider.getAddress()).rejects.toThrow(/no accounts/i);
  });

  it("throws MintCoreError when bch_getAccounts returns a non-array", async () => {
    const client = makeClient({ requestImpl: async () => null });
    const provider = new WalletConnectProvider({ client, topic: "t" });

    await expect(provider.getAddress()).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when the RPC call rejects", async () => {
    const client = makeClient({
      requestImpl: async () => {
        throw new Error("connection lost");
      },
    });
    const provider = new WalletConnectProvider({ client, topic: "t" });

    await expect(provider.getAddress()).rejects.toThrow(MintCoreError);
    await expect(provider.getAddress()).rejects.toThrow(/connection lost/i);
  });
});

// ─── signTransaction ──────────────────────────────────────────────────────────

describe("WalletConnectProvider.signTransaction", () => {
  const SOURCE_OUTPUTS = [
    {
      satoshis: 100_000n,
      lockingBytecode: new Uint8Array([0x76, 0xa9, 0x14]),
    },
  ] as const;

  it("calls bch_signTransaction and returns signed hex", async () => {
    const client = makeClient({ requestImpl: async () => SIGNED_TX_HEX });
    const provider = makeProvider({ client });

    const result = await provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    expect(result).toBe(SIGNED_TX_HEX);
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ method: "bch_signTransaction" }),
      })
    );
  });

  it("serialises satoshis as a string in the RPC params", async () => {
    const client = makeClient({ requestImpl: async () => SIGNED_TX_HEX });
    const provider = makeProvider({ client });

    await provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    const call = (client.request as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const params = call.request.params as {
      transaction: string;
      sourceOutputs: Array<{ satoshis: string; lockingBytecode: string }>;
    };

    expect(params.transaction).toBe(UNSIGNED_TX_HEX);
    expect(typeof params.sourceOutputs[0].satoshis).toBe("string");
    expect(params.sourceOutputs[0].satoshis).toBe("100000");
  });

  it("serialises lockingBytecode as a lowercase hex string in the RPC params", async () => {
    const client = makeClient({ requestImpl: async () => SIGNED_TX_HEX });
    const provider = makeProvider({ client });

    await provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    const call = (client.request as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const params = call.request.params as {
      sourceOutputs: Array<{ lockingBytecode: string }>;
    };

    expect(params.sourceOutputs[0].lockingBytecode).toBe("76a914");
  });

  it("sends the correct chainId in the request", async () => {
    const client = makeClient({ requestImpl: async () => SIGNED_TX_HEX });
    const provider = makeProvider({ client, chainId: "bch:bitcoincash" });

    await provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({ chainId: "bch:bitcoincash" })
    );
  });

  it("throws MintCoreError when the wallet returns an empty string", async () => {
    const client = makeClient({ requestImpl: async () => "" });
    const provider = makeProvider({ client });

    await expect(
      provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)
    ).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when the wallet returns a non-string value", async () => {
    const client = makeClient({ requestImpl: async () => 42 });
    const provider = makeProvider({ client });

    await expect(
      provider.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)
    ).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when the RPC call rejects", async () => {
    const client = makeClient({
      requestImpl: async () => {
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

    const client = makeClient({ requestImpl: async () => SIGNED_TX_HEX });
    const provider = makeProvider({ client });

    await provider.signTransaction(UNSIGNED_TX_HEX, multiOutputs);

    const call = (client.request as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const params = call.request.params as {
      sourceOutputs: Array<{ satoshis: string; lockingBytecode: string }>;
    };

    expect(params.sourceOutputs).toHaveLength(2);
    expect(params.sourceOutputs[0]).toEqual({ satoshis: "200000", lockingBytecode: "abcd" });
    expect(params.sourceOutputs[1]).toEqual({ satoshis: "50000", lockingBytecode: "ef" });
  });
});

// ─── WalletProvider interface compliance ──────────────────────────────────────

describe("WalletConnectProvider satisfies WalletProvider interface", () => {
  it("exposes getAddress and signTransaction methods", () => {
    const provider = makeProvider();
    expect(typeof provider.getAddress).toBe("function");
    expect(typeof provider.signTransaction).toBe("function");
  });
});
