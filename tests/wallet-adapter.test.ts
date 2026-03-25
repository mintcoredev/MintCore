import { describe, it, expect, vi, beforeEach } from "vitest";
import { WizardAdapter, type WizardAdapterClientLike } from "../src/wallet/adapters/WizardAdapter.js";
import { WalletRegistry, createWalletRegistry } from "../src/wallet/registry.js";
import { MintCoreError } from "../src/utils/errors.js";
import { fromHex, toHex } from "../src/utils/hex.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAINNET_ADDRESS = "bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";
const SIGNED_TX_HEX = "deadbeef";
const UNSIGNED_TX_HEX = "cafebabe";
const UNSIGNED_TX_BYTES = fromHex(UNSIGNED_TX_HEX);
const SIGNED_TX_BYTES = fromHex(SIGNED_TX_HEX);
const SIGNATURE_HEX = "aabbccdd";

function makeClient(overrides?: {
  getAccountsImpl?: () => Promise<string[]>;
  signTransactionImpl?: (
    txHex: string,
    outputs: Array<{ satoshis: string; lockingBytecode: string }>
  ) => Promise<string>;
  signMessageImpl?: (message: string) => Promise<string>;
  broadcastTransactionImpl?: (txHex: string) => Promise<string>;
  disconnectImpl?: () => Promise<void>;
}): WizardAdapterClientLike {
  return {
    getAccounts: vi.fn().mockImplementation(
      overrides?.getAccountsImpl ?? (async () => [MAINNET_ADDRESS])
    ),
    signTransaction: vi.fn().mockImplementation(
      overrides?.signTransactionImpl ?? (async () => SIGNED_TX_HEX)
    ),
    signMessage: overrides?.signMessageImpl
      ? vi.fn().mockImplementation(overrides.signMessageImpl)
      : vi.fn().mockResolvedValue(SIGNATURE_HEX),
    broadcastTransaction: overrides?.broadcastTransactionImpl
      ? vi.fn().mockImplementation(overrides.broadcastTransactionImpl)
      : vi.fn().mockResolvedValue("txid-abc"),
    disconnect: vi.fn().mockImplementation(
      overrides?.disconnectImpl ?? (async () => undefined)
    ),
  };
}

function makeAdapter(client = makeClient()): WizardAdapter {
  return new WizardAdapter({ client });
}

// ─── WalletAdapter interface compliance ───────────────────────────────────────

describe("WizardAdapter satisfies WalletAdapter interface", () => {
  it("has a 'name' property of 'WizardConnect'", () => {
    const adapter = makeAdapter();
    expect(adapter.name).toBe("WizardConnect");
  });

  it("exposes connect, disconnect, getAddress, signMessage, signTransaction, on", () => {
    const adapter = makeAdapter();
    expect(typeof adapter.connect).toBe("function");
    expect(typeof adapter.disconnect).toBe("function");
    expect(typeof adapter.getAddress).toBe("function");
    expect(typeof adapter.signMessage).toBe("function");
    expect(typeof adapter.signTransaction).toBe("function");
    expect(typeof adapter.on).toBe("function");
  });

  it("exposes the optional off() method", () => {
    const adapter = makeAdapter();
    expect(typeof adapter.off).toBe("function");
  });

  it("exposes broadcastTransaction as an optional method", () => {
    const adapter = makeAdapter();
    expect(typeof adapter.broadcastTransaction).toBe("function");
  });
});

// ─── constructor ──────────────────────────────────────────────────────────────

describe("WizardAdapter constructor", () => {
  it("throws when client is null", () => {
    expect(
      () => new WizardAdapter({ client: null as unknown as WizardAdapterClientLike })
    ).toThrow(MintCoreError);
  });

  it("constructs successfully with a valid client", () => {
    expect(() => makeAdapter()).not.toThrow();
  });
});

// ─── connect ──────────────────────────────────────────────────────────────────

describe("WizardAdapter.connect", () => {
  it("calls getAccounts and resolves without throwing", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);
    await expect(adapter.connect()).resolves.toBeUndefined();
    expect(client.getAccounts).toHaveBeenCalled();
  });

  it("caches the address during connect", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);
    await adapter.connect();
    // getAddress should use the cached value (no new RPC call)
    await adapter.getAddress();
    expect(client.getAccounts).toHaveBeenCalledTimes(1);
  });

  it("emits 'connect' event with the address", async () => {
    const adapter = makeAdapter();
    const handler = vi.fn();
    adapter.on("connect", handler);
    await adapter.connect();
    expect(handler).toHaveBeenCalledWith(MAINNET_ADDRESS);
  });

  it("throws MintCoreError when getAccounts returns empty array", async () => {
    const client = makeClient({ getAccountsImpl: async () => [] });
    const adapter = makeAdapter(client);
    await expect(adapter.connect()).rejects.toThrow(MintCoreError);
    await expect(adapter.connect()).rejects.toThrow(/no accounts/i);
  });

  it("throws MintCoreError when getAccounts rejects", async () => {
    const client = makeClient({
      getAccountsImpl: async () => {
        throw new Error("network error");
      },
    });
    const adapter = makeAdapter(client);
    await expect(adapter.connect()).rejects.toThrow(MintCoreError);
    await expect(adapter.connect()).rejects.toThrow(/network error/i);
  });
});

// ─── disconnect ───────────────────────────────────────────────────────────────

describe("WizardAdapter.disconnect", () => {
  it("calls client.disconnect", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);
    await adapter.connect();
    await adapter.disconnect();
    expect(client.disconnect).toHaveBeenCalled();
  });

  it("emits 'disconnect' event", async () => {
    const adapter = makeAdapter();
    const handler = vi.fn();
    adapter.on("disconnect", handler);
    await adapter.connect();
    await adapter.disconnect();
    expect(handler).toHaveBeenCalled();
  });

  it("is a no-op when already disconnected", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);
    // never connected — disconnect should be a no-op
    await expect(adapter.disconnect()).resolves.toBeUndefined();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it("does not throw when underlying disconnect rejects", async () => {
    const client = makeClient({
      disconnectImpl: async () => {
        throw new Error("network error");
      },
    });
    const adapter = makeAdapter(client);
    await adapter.connect();
    await expect(adapter.disconnect()).resolves.toBeUndefined();
  });
});

// ─── getAddress ───────────────────────────────────────────────────────────────

describe("WizardAdapter.getAddress", () => {
  it("throws when not connected", async () => {
    const adapter = makeAdapter();
    await expect(adapter.getAddress()).rejects.toThrow(MintCoreError);
    await expect(adapter.getAddress()).rejects.toThrow(/not connected/i);
  });

  it("returns address after connect (cached)", async () => {
    const adapter = makeAdapter();
    await adapter.connect();
    const addr = await adapter.getAddress();
    expect(addr).toBe(MAINNET_ADDRESS);
  });

  it("throws when not connected after disconnect", async () => {
    const adapter = makeAdapter();
    await adapter.connect();
    await adapter.disconnect();
    await expect(adapter.getAddress()).rejects.toThrow(MintCoreError);
  });
});

// ─── signMessage ──────────────────────────────────────────────────────────────

describe("WizardAdapter.signMessage", () => {
  it("throws when not connected", async () => {
    const adapter = makeAdapter();
    await expect(adapter.signMessage("hello")).rejects.toThrow(MintCoreError);
  });

  it("signs a message and returns the signature hex", async () => {
    const client = makeClient({
      signMessageImpl: async () => SIGNATURE_HEX,
    });
    const adapter = makeAdapter(client);
    await adapter.connect();
    const sig = await adapter.signMessage("Hello BCH");
    expect(sig).toBe(SIGNATURE_HEX);
    expect(client.signMessage).toHaveBeenCalledWith("Hello BCH");
  });

  it("throws MintCoreError when the client does not implement signMessage", async () => {
    const client = makeClient();
    // Remove signMessage to simulate a client that doesn't support it
    const clientWithout = { ...client, signMessage: undefined } as unknown as WizardAdapterClientLike;
    const adapter = new WizardAdapter({ client: clientWithout });
    await adapter.connect();
    await expect(adapter.signMessage("hello")).rejects.toThrow(MintCoreError);
    await expect(adapter.signMessage("hello")).rejects.toThrow(/signMessage/i);
  });

  it("throws MintCoreError when signMessage rejects", async () => {
    const client = makeClient({
      signMessageImpl: async () => {
        throw new Error("user rejected");
      },
    });
    const adapter = makeAdapter(client);
    await adapter.connect();
    await expect(adapter.signMessage("hello")).rejects.toThrow(/user rejected/i);
  });
});

// ─── signTransaction (generic Uint8Array interface) ───────────────────────────

describe("WizardAdapter.signTransaction", () => {
  it("throws when not connected", async () => {
    const adapter = makeAdapter();
    await expect(adapter.signTransaction(UNSIGNED_TX_BYTES)).rejects.toThrow(
      MintCoreError
    );
  });

  it("converts Uint8Array to hex, calls client, returns Uint8Array", async () => {
    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const adapter = makeAdapter(client);
    await adapter.connect();

    const result = await adapter.signTransaction(UNSIGNED_TX_BYTES);

    expect(result).toBeInstanceOf(Uint8Array);
    expect(toHex(result)).toBe(SIGNED_TX_HEX);
    expect(client.signTransaction).toHaveBeenCalledWith(UNSIGNED_TX_HEX, []);
  });

  it("throws MintCoreError when client returns an empty string", async () => {
    const client = makeClient({ signTransactionImpl: async () => "" });
    const adapter = makeAdapter(client);
    await adapter.connect();
    await expect(adapter.signTransaction(UNSIGNED_TX_BYTES)).rejects.toThrow(
      MintCoreError
    );
  });

  it("throws MintCoreError when client rejects", async () => {
    const client = makeClient({
      signTransactionImpl: async () => {
        throw new Error("user rejected");
      },
    });
    const adapter = makeAdapter(client);
    await adapter.connect();
    await expect(adapter.signTransaction(UNSIGNED_TX_BYTES)).rejects.toThrow(
      /user rejected/i
    );
  });
});

// ─── signBchTransaction (BCH-specific with sourceOutputs) ────────────────────

describe("WizardAdapter.signBchTransaction", () => {
  const SOURCE_OUTPUTS = [
    {
      satoshis: 100_000n,
      lockingBytecode: new Uint8Array([0x76, 0xa9, 0x14]),
    },
  ] as const;

  it("throws when not connected", async () => {
    const adapter = makeAdapter();
    await expect(
      adapter.signBchTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)
    ).rejects.toThrow(MintCoreError);
  });

  it("serialises source outputs and returns signed hex", async () => {
    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const adapter = makeAdapter(client);
    await adapter.connect();

    const result = await adapter.signBchTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    expect(result).toBe(SIGNED_TX_HEX);
    expect(client.signTransaction).toHaveBeenCalledWith(UNSIGNED_TX_HEX, [
      { satoshis: "100000", lockingBytecode: "76a914" },
    ]);
  });

  it("serialises multiple source outputs correctly", async () => {
    const multiOutputs = [
      { satoshis: 200_000n, lockingBytecode: new Uint8Array([0xab, 0xcd]) },
      { satoshis: 50_000n, lockingBytecode: new Uint8Array([0xef]) },
    ] as const;

    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const adapter = makeAdapter(client);
    await adapter.connect();

    await adapter.signBchTransaction(UNSIGNED_TX_HEX, multiOutputs);

    const call = (client.signTransaction as ReturnType<typeof vi.fn>).mock.calls[0];
    const outputs = call[1] as Array<{ satoshis: string; lockingBytecode: string }>;
    expect(outputs).toHaveLength(2);
    expect(outputs[0]).toEqual({ satoshis: "200000", lockingBytecode: "abcd" });
    expect(outputs[1]).toEqual({ satoshis: "50000", lockingBytecode: "ef" });
  });
});

// ─── broadcastTransaction ─────────────────────────────────────────────────────

describe("WizardAdapter.broadcastTransaction", () => {
  it("throws when not connected", async () => {
    const adapter = makeAdapter();
    await expect(
      adapter.broadcastTransaction(SIGNED_TX_BYTES)
    ).rejects.toThrow(MintCoreError);
  });

  it("broadcasts the signed transaction and returns the txid", async () => {
    const client = makeClient({
      broadcastTransactionImpl: async () => "txid-abc",
    });
    const adapter = makeAdapter(client);
    await adapter.connect();

    const txid = await adapter.broadcastTransaction(SIGNED_TX_BYTES);

    expect(txid).toBe("txid-abc");
    expect(client.broadcastTransaction).toHaveBeenCalledWith(SIGNED_TX_HEX);
  });

  it("throws when the client does not implement broadcastTransaction", async () => {
    const client = makeClient();
    const clientWithout = {
      ...client,
      broadcastTransaction: undefined,
    } as unknown as WizardAdapterClientLike;
    const adapter = new WizardAdapter({ client: clientWithout });
    await adapter.connect();
    await expect(
      adapter.broadcastTransaction(SIGNED_TX_BYTES)
    ).rejects.toThrow(MintCoreError);
    await expect(
      adapter.broadcastTransaction(SIGNED_TX_BYTES)
    ).rejects.toThrow(/broadcastTransaction/i);
  });
});

// ─── Event system ─────────────────────────────────────────────────────────────

describe("WizardAdapter event system", () => {
  it("on() registers a listener; off() removes it", async () => {
    const adapter = makeAdapter();
    const handler = vi.fn();
    adapter.on("connect", handler);
    adapter.off("connect", handler);
    await adapter.connect();
    expect(handler).not.toHaveBeenCalled();
  });

  it("multiple listeners for the same event all fire", async () => {
    const adapter = makeAdapter();
    const h1 = vi.fn();
    const h2 = vi.fn();
    adapter.on("connect", h1);
    adapter.on("connect", h2);
    await adapter.connect();
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it("listener errors do not propagate", async () => {
    const adapter = makeAdapter();
    adapter.on("connect", () => {
      throw new Error("listener crash");
    });
    await expect(adapter.connect()).resolves.toBeUndefined();
  });
});

// ─── WalletRegistry ──────────────────────────────────────────────────────────

describe("WalletRegistry", () => {
  it("registers and retrieves an adapter by name", () => {
    const adapter = makeAdapter();
    const registry = new WalletRegistry();
    registry.register(adapter);
    expect(registry.get("WizardConnect")).toBe(adapter);
  });

  it("getAll() returns all registered adapters", () => {
    const a1 = makeAdapter();
    // Use a plain object adapter with a different name to test multi-adapter registration
    const a2: import("../src/wallet/adapters/WalletAdapter.js").WalletAdapter = {
      name: "AnotherWallet",
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getAddress: vi.fn().mockResolvedValue(MAINNET_ADDRESS),
      signMessage: vi.fn().mockResolvedValue(SIGNATURE_HEX),
      signTransaction: vi.fn().mockResolvedValue(new Uint8Array()),
      on: vi.fn(),
    };
    const registry = new WalletRegistry();
    registry.register(a1);
    registry.register(a2);
    expect(registry.getAll()).toHaveLength(2);
  });

  it("getNames() returns adapter names", () => {
    const registry = createWalletRegistry([makeAdapter()]);
    expect(registry.getNames()).toContain("WizardConnect");
  });

  it("has() returns true for registered adapter", () => {
    const registry = createWalletRegistry([makeAdapter()]);
    expect(registry.has("WizardConnect")).toBe(true);
    expect(registry.has("NonExistent")).toBe(false);
  });

  it("size reflects the number of registered adapters", () => {
    const registry = createWalletRegistry([makeAdapter()]);
    expect(registry.size).toBe(1);
  });

  it("duplicate name replaces the previous adapter", () => {
    const a1 = makeAdapter();
    const a2 = new WizardAdapter({ client: makeClient() });
    const registry = new WalletRegistry();
    registry.register(a1);
    registry.register(a2);
    expect(registry.size).toBe(1);
    expect(registry.get("WizardConnect")).toBe(a2);
  });

  it("get() returns undefined for unknown adapter", () => {
    const registry = new WalletRegistry();
    expect(registry.get("Unknown")).toBeUndefined();
  });
});

// ─── createWalletRegistry factory ─────────────────────────────────────────────

describe("createWalletRegistry", () => {
  it("creates a registry with the given adapters", () => {
    const registry = createWalletRegistry([makeAdapter()]);
    expect(registry.has("WizardConnect")).toBe(true);
  });

  it("returns an empty registry when no adapters given", () => {
    const registry = createWalletRegistry([]);
    expect(registry.size).toBe(0);
  });
});

// ─── WalletAdapter id field ───────────────────────────────────────────────────

/**
 * Helper that mirrors the adapter-lookup logic in WalletProvider.connect():
 *   find by id first, then fall back to name.
 */
function findAdapter(
  adapters: import("../src/wallet/adapters/WalletAdapter.js").WalletAdapter[],
  key: string
): import("../src/wallet/adapters/WalletAdapter.js").WalletAdapter | undefined {
  return adapters.find((a) => a.id === key) ?? adapters.find((a) => a.name === key);
}

function makePlainAdapter(
  overrides: Partial<import("../src/wallet/adapters/WalletAdapter.js").WalletAdapter> & { name: string }
): import("../src/wallet/adapters/WalletAdapter.js").WalletAdapter {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getAddress: vi.fn().mockResolvedValue(MAINNET_ADDRESS),
    signMessage: vi.fn().mockResolvedValue(SIGNATURE_HEX),
    signTransaction: vi.fn().mockResolvedValue(new Uint8Array()),
    on: vi.fn(),
    ...overrides,
  };
}

describe("WalletAdapter optional id field", () => {
  it("WalletAdapter interface accepts an optional id field", () => {
    const adapter = makePlainAdapter({ id: "paytaca", name: "Paytaca" });
    expect(adapter.id).toBe("paytaca");
    expect(adapter.name).toBe("Paytaca");
  });

  it("adapter without id has id === undefined", () => {
    const adapter = makePlainAdapter({ name: "Paytaca" });
    expect(adapter.id).toBeUndefined();
  });
});

describe("WalletProvider adapter lookup: id-first, name fallback", () => {
  it("finds an adapter by id when id matches", () => {
    const adapter = makePlainAdapter({ id: "paytaca", name: "Paytaca" });
    expect(findAdapter([adapter], "paytaca")).toBe(adapter);
  });

  it("finds an adapter by name when id is not set", () => {
    const adapter = makePlainAdapter({ name: "Paytaca" });
    expect(findAdapter([adapter], "Paytaca")).toBe(adapter);
  });

  it("id match takes priority over a different adapter whose name matches the key", () => {
    const byId = makePlainAdapter({ id: "paytaca", name: "PaytacaByIdMatch" });
    const byName = makePlainAdapter({ name: "paytaca" });
    // "paytaca" should resolve to byId (id match) not byName (name match)
    expect(findAdapter([byName, byId], "paytaca")).toBe(byId);
  });

  it("falls back to name match when no id matches", () => {
    const adapter = makePlainAdapter({ id: "paytaca", name: "Paytaca" });
    // Searching by display name "Paytaca" — no adapter has id === "Paytaca",
    // so it falls through to the name comparison.
    expect(findAdapter([adapter], "Paytaca")).toBe(adapter);
  });

  it("returns undefined when neither id nor name matches", () => {
    const adapter = makePlainAdapter({ id: "paytaca", name: "Paytaca" });
    expect(findAdapter([adapter], "zapit")).toBeUndefined();
  });

  it("works across multiple adapters with mixed id presence", () => {
    const paytaca = makePlainAdapter({ id: "paytaca", name: "Paytaca" });
    const zapit = makePlainAdapter({ id: "zapit", name: "Zapit" });
    const legacy = makePlainAdapter({ name: "LegacyWallet" });
    const adapters = [paytaca, zapit, legacy];

    expect(findAdapter(adapters, "paytaca")).toBe(paytaca);
    expect(findAdapter(adapters, "zapit")).toBe(zapit);
    expect(findAdapter(adapters, "LegacyWallet")).toBe(legacy);
    expect(findAdapter(adapters, "unknown")).toBeUndefined();
  });
});
