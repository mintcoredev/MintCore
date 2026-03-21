import { describe, it, expect, vi, beforeEach } from "vitest";
import { WalletClient, type WalletConnectV2Client, type WalletConnectSession } from "../src/wallet/WalletClient.js";
import { WalletManager } from "../src/wallet/WalletManager.js";
import {
  WalletType,
  WalletConnectionState,
  BCH_CHAIN_IDS,
} from "../src/wallet/WalletTypes.js";
import { MintCoreError } from "../src/utils/errors.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAINNET_ADDRESS = "bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";
const SIGNED_TX_HEX = "deadbeef";
const UNSIGNED_TX_HEX = "cafebabe";
const TEST_TOPIC = "test-topic-abc";

function makeClient(overrides?: {
  requestImpl?: (args: Parameters<WalletConnectV2Client["request"]>[0]) => Promise<unknown>;
  disconnectImpl?: () => Promise<void>;
}): WalletConnectV2Client {
  return {
    request: vi.fn().mockImplementation(
      overrides?.requestImpl ?? (async () => [MAINNET_ADDRESS])
    ),
    disconnect: vi.fn().mockImplementation(
      overrides?.disconnectImpl ?? (async () => undefined)
    ),
  };
}

function makeSession(overrides?: Partial<WalletConnectSession>): WalletConnectSession {
  return {
    topic: TEST_TOPIC,
    expiry: Date.now() + 86_400_000,
    namespaces: {
      bch: {
        accounts: [`bch:bitcoincash:${MAINNET_ADDRESS}`],
        methods: ["bch_getAccounts", "bch_signTransaction", "personal_sign"],
        events: [],
      },
    },
    ...overrides,
  };
}

function makeWalletClient(
  client = makeClient(),
  session = makeSession()
): WalletClient {
  return new WalletClient({
    client,
    session,
    walletType: WalletType.Paytaca,
    network: "mainnet",
  });
}

// ─── BCH_CHAIN_IDS ────────────────────────────────────────────────────────────

describe("BCH_CHAIN_IDS", () => {
  it("maps mainnet to bch:bitcoincash", () => {
    expect(BCH_CHAIN_IDS.mainnet).toBe("bch:bitcoincash");
  });

  it("maps testnet to bch:bchtest", () => {
    expect(BCH_CHAIN_IDS.testnet).toBe("bch:bchtest");
  });

  it("maps regtest to bch:bchreg", () => {
    expect(BCH_CHAIN_IDS.regtest).toBe("bch:bchreg");
  });
});

// ─── WalletClient constructor ─────────────────────────────────────────────────

describe("WalletClient constructor", () => {
  it("throws when client is null", () => {
    expect(
      () =>
        new WalletClient({
          client: null as unknown as WalletConnectV2Client,
          session: makeSession(),
          walletType: WalletType.Paytaca,
        })
    ).toThrow(MintCoreError);
  });

  it("throws when session topic is empty", () => {
    expect(
      () =>
        new WalletClient({
          client: makeClient(),
          session: makeSession({ topic: "  " }),
          walletType: WalletType.Cashonize,
        })
    ).toThrow(MintCoreError);
  });

  it("derives chainId from network option", () => {
    const wc = new WalletClient({
      client: makeClient(),
      session: makeSession(),
      walletType: WalletType.Zapit,
      network: "testnet",
    });
    expect((wc as any).chainId).toBe("bch:bchtest");
  });

  it("respects explicit chainId override", () => {
    const wc = new WalletClient({
      client: makeClient(),
      session: makeSession(),
      walletType: WalletType.Paytaca,
      chainId: "bch:custom",
    });
    expect((wc as any).chainId).toBe("bch:custom");
  });

  it("defaults to mainnet chainId", () => {
    const wc = makeWalletClient();
    expect((wc as any).chainId).toBe("bch:bitcoincash");
  });
});

// ─── WalletClient.getAddress ──────────────────────────────────────────────────

describe("WalletClient.getAddress", () => {
  it("calls bch_getAccounts and returns the address", async () => {
    const client = makeClient({ requestImpl: async () => [MAINNET_ADDRESS] });
    const wc = makeWalletClient(client);

    const addr = await wc.getAddress();

    expect(addr).toBe(MAINNET_ADDRESS);
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: TEST_TOPIC,
        chainId: "bch:bitcoincash",
        request: expect.objectContaining({ method: "bch_getAccounts" }),
      })
    );
  });

  it("strips CAIP-10 prefix from accounts response", async () => {
    const caip10 = `bch:bitcoincash:${MAINNET_ADDRESS}`;
    const client = makeClient({ requestImpl: async () => [caip10] });
    const wc = makeWalletClient(client);

    const addr = await wc.getAddress();

    expect(addr).toBe(MAINNET_ADDRESS);
  });

  it("caches the address after the first call", async () => {
    const client = makeClient({ requestImpl: async () => [MAINNET_ADDRESS] });
    const wc = makeWalletClient(client);

    await wc.getAddress();
    await wc.getAddress();

    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it("throws MintCoreError when bch_getAccounts returns empty array", async () => {
    const client = makeClient({ requestImpl: async () => [] });
    const wc = makeWalletClient(client);

    await expect(wc.getAddress()).rejects.toThrow(MintCoreError);
    await expect(wc.getAddress()).rejects.toThrow(/no accounts/i);
  });

  it("throws MintCoreError when RPC rejects", async () => {
    const client = makeClient({
      requestImpl: async () => { throw new Error("connection lost"); },
    });
    const wc = makeWalletClient(client);

    await expect(wc.getAddress()).rejects.toThrow(MintCoreError);
    await expect(wc.getAddress()).rejects.toThrow(/connection lost/i);
  });

  it("throws after disconnect", async () => {
    const wc = makeWalletClient();
    await wc.disconnect();

    await expect(wc.getAddress()).rejects.toThrow(MintCoreError);
    await expect(wc.getAddress()).rejects.toThrow(/disconnected/i);
  });
});

// ─── WalletClient.getWalletType ───────────────────────────────────────────────

describe("WalletClient.getWalletType", () => {
  it("returns the wallet type set in options", () => {
    const wc = new WalletClient({
      client: makeClient(),
      session: makeSession(),
      walletType: WalletType.Cashonize,
    });
    expect(wc.getWalletType()).toBe(WalletType.Cashonize);
  });

  it("returns WalletType.Zapit when set", () => {
    const wc = new WalletClient({
      client: makeClient(),
      session: makeSession(),
      walletType: WalletType.Zapit,
    });
    expect(wc.getWalletType()).toBe(WalletType.Zapit);
  });
});

// ─── WalletClient.getSession ──────────────────────────────────────────────────

describe("WalletClient.getSession", () => {
  it("returns a WalletSession with correct fields", async () => {
    const client = makeClient({ requestImpl: async () => [MAINNET_ADDRESS] });
    const session = makeSession();
    const wc = new WalletClient({
      client,
      session,
      walletType: WalletType.Paytaca,
      network: "mainnet",
    });

    const result = await wc.getSession();

    expect(result).not.toBeNull();
    expect(result!.topic).toBe(TEST_TOPIC);
    expect(result!.address).toBe(MAINNET_ADDRESS);
    expect(result!.chainId).toBe("bch:bitcoincash");
    expect(result!.walletType).toBe(WalletType.Paytaca);
    expect(typeof result!.createdAt).toBe("number");
    expect(result!.expiry).toBe(session.expiry);
  });

  it("returns null after disconnect", async () => {
    const wc = makeWalletClient();
    await wc.disconnect();

    const session = await wc.getSession();
    expect(session).toBeNull();
  });
});

// ─── WalletClient.signTransaction ────────────────────────────────────────────

describe("WalletClient.signTransaction", () => {
  const SOURCE_OUTPUTS = [
    { satoshis: 100_000n, lockingBytecode: new Uint8Array([0x76, 0xa9, 0x14]) },
  ] as const;

  it("calls bch_signTransaction and returns signed hex", async () => {
    const client = makeClient({ requestImpl: async () => SIGNED_TX_HEX });
    const wc = makeWalletClient(client);

    const result = await wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    expect(result).toBe(SIGNED_TX_HEX);
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({ method: "bch_signTransaction" }),
      })
    );
  });

  it("serialises satoshis as a string", async () => {
    const client = makeClient({ requestImpl: async () => SIGNED_TX_HEX });
    const wc = makeWalletClient(client);

    await wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    const call = (client.request as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const { sourceOutputs } = call.request.params as { sourceOutputs: Array<{ satoshis: string }> };
    expect(typeof sourceOutputs[0].satoshis).toBe("string");
    expect(sourceOutputs[0].satoshis).toBe("100000");
  });

  it("serialises lockingBytecode as lowercase hex (using src/utils/hex.ts toHex)", async () => {
    const client = makeClient({ requestImpl: async () => SIGNED_TX_HEX });
    const wc = makeWalletClient(client);

    await wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    const call = (client.request as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const { sourceOutputs } = call.request.params as { sourceOutputs: Array<{ lockingBytecode: string }> };
    expect(sourceOutputs[0].lockingBytecode).toBe("76a914");
  });

  it("throws MintCoreError when wallet returns an empty string", async () => {
    const client = makeClient({ requestImpl: async () => "" });
    const wc = makeWalletClient(client);

    await expect(wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when RPC rejects", async () => {
    const client = makeClient({
      requestImpl: async () => { throw new Error("user rejected"); },
    });
    const wc = makeWalletClient(client);

    await expect(wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)).rejects.toThrow(/user rejected/i);
  });

  it("throws after disconnect", async () => {
    const wc = makeWalletClient();
    await wc.disconnect();

    await expect(wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)).rejects.toThrow(MintCoreError);
  });
});

// ─── WalletClient.signMessage ─────────────────────────────────────────────────

describe("WalletClient.signMessage", () => {
  it("calls personal_sign and returns the signature", async () => {
    const SIG = "sig-abc";
    const client = makeClient({ requestImpl: async () => SIG });
    const wc = makeWalletClient(client);

    const result = await wc.signMessage("Hello BCH");

    expect(result).toBe(SIG);
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          method: "personal_sign",
          params: { message: "Hello BCH" },
        }),
      })
    );
  });

  it("throws MintCoreError when wallet returns an empty string", async () => {
    const client = makeClient({ requestImpl: async () => "" });
    const wc = makeWalletClient(client);

    await expect(wc.signMessage("hello")).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when RPC rejects", async () => {
    const client = makeClient({
      requestImpl: async () => { throw new Error("sign rejected"); },
    });
    const wc = makeWalletClient(client);

    await expect(wc.signMessage("hello")).rejects.toThrow(/sign rejected/i);
  });

  it("throws after disconnect", async () => {
    const wc = makeWalletClient();
    await wc.disconnect();

    await expect(wc.signMessage("hello")).rejects.toThrow(MintCoreError);
  });
});

// ─── WalletClient.disconnect ──────────────────────────────────────────────────

describe("WalletClient.disconnect", () => {
  it("calls client.disconnect with the correct topic", async () => {
    const client = makeClient();
    const wc = makeWalletClient(client);

    await wc.disconnect();

    expect(client.disconnect).toHaveBeenCalledWith(
      expect.objectContaining({ topic: TEST_TOPIC })
    );
  });

  it("is idempotent — second call is a no-op", async () => {
    const client = makeClient();
    const wc = makeWalletClient(client);

    await wc.disconnect();
    await wc.disconnect();

    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  it("does not throw when underlying disconnect rejects", async () => {
    const client = makeClient({
      disconnectImpl: async () => { throw new Error("network error"); },
    });
    const wc = makeWalletClient(client);

    await expect(wc.disconnect()).resolves.toBeUndefined();
  });
});

// ─── WalletManager ────────────────────────────────────────────────────────────

describe("WalletManager", () => {
  let client: WalletConnectV2Client;
  let session: WalletConnectSession;
  let manager: WalletManager;

  beforeEach(() => {
    client = makeClient({ requestImpl: async () => [MAINNET_ADDRESS] });
    session = makeSession();
    manager = new WalletManager({ network: "mainnet" });
  });

  it("starts in Disconnected state", () => {
    expect(manager.getConnectionState()).toBe(WalletConnectionState.Disconnected);
  });

  it("connect() transitions to Connected state", async () => {
    await manager.connect(client, session, WalletType.Paytaca);
    expect(manager.getConnectionState()).toBe(WalletConnectionState.Connected);
  });

  it("connect() returns a WalletSession with expected fields", async () => {
    const result = await manager.connect(client, session, WalletType.Paytaca);

    expect(result.topic).toBe(TEST_TOPIC);
    expect(result.address).toBe(MAINNET_ADDRESS);
    expect(result.walletType).toBe(WalletType.Paytaca);
    expect(result.chainId).toBe("bch:bitcoincash");
  });

  it("getSession() returns the active session after connect", async () => {
    await manager.connect(client, session, WalletType.Cashonize);
    const s = manager.getSession();
    expect(s).not.toBeNull();
    expect(s!.walletType).toBe(WalletType.Cashonize);
  });

  it("getSession() returns null before connect", () => {
    expect(manager.getSession()).toBeNull();
  });

  it("getAddress() returns the wallet address", async () => {
    await manager.connect(client, session, WalletType.Paytaca);
    const addr = await manager.getAddress();
    expect(addr).toBe(MAINNET_ADDRESS);
  });

  it("getWalletType() returns the correct type", async () => {
    await manager.connect(client, session, WalletType.Zapit);
    expect(manager.getWalletType()).toBe(WalletType.Zapit);
  });

  it("signTransaction() delegates to WalletClient", async () => {
    // First call (bch_getAccounts) returns the address; subsequent calls return signed tx hex.
    let callCount = 0;
    const sigClient = makeClient({
      requestImpl: async () => {
        callCount++;
        return callCount === 1 ? [MAINNET_ADDRESS] : SIGNED_TX_HEX;
      },
    });
    await manager.connect(sigClient, session, WalletType.Paytaca);

    const result = await manager.signTransaction(UNSIGNED_TX_HEX, [
      { satoshis: 1000n, lockingBytecode: new Uint8Array([0x76]) },
    ]);
    expect(result).toBe(SIGNED_TX_HEX);
  });

  it("signMessage() delegates to WalletClient", async () => {
    const SIG = "my-signature";
    // First call (bch_getAccounts) returns the address; subsequent call returns the signature.
    let callCount = 0;
    const sigClient = makeClient({
      requestImpl: async () => {
        callCount++;
        return callCount === 1 ? [MAINNET_ADDRESS] : SIG;
      },
    });
    await manager.connect(sigClient, session, WalletType.Paytaca);

    const result = await manager.signMessage("hello world");
    expect(result).toBe(SIG);
  });

  it("disconnect() transitions to Disconnected state", async () => {
    await manager.connect(client, session, WalletType.Paytaca);
    await manager.disconnect();
    expect(manager.getConnectionState()).toBe(WalletConnectionState.Disconnected);
  });

  it("disconnect() clears the session", async () => {
    await manager.connect(client, session, WalletType.Paytaca);
    await manager.disconnect();
    expect(manager.getSession()).toBeNull();
  });

  it("disconnect() is a no-op when already disconnected", async () => {
    await expect(manager.disconnect()).resolves.toBeUndefined();
  });

  it("throws MintCoreError when calling getAddress before connect", async () => {
    await expect(manager.getAddress()).rejects.toThrow(MintCoreError);
    await expect(manager.getAddress()).rejects.toThrow(/no active wallet/i);
  });

  it("throws MintCoreError when calling getWalletType before connect", () => {
    expect(() => manager.getWalletType()).toThrow(MintCoreError);
  });

  it("throws MintCoreError when calling signTransaction before connect", async () => {
    await expect(
      manager.signTransaction(UNSIGNED_TX_HEX, [])
    ).rejects.toThrow(MintCoreError);
  });

  // ─── Event system ──────────────────────────────────────────────────────────

  it("emits 'connect' event with WalletSession on connect", async () => {
    const handler = vi.fn();
    manager.on("connect", handler);

    await manager.connect(client, session, WalletType.Paytaca);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ address: MAINNET_ADDRESS })
    );
  });

  it("emits 'disconnect' event on disconnect", async () => {
    const handler = vi.fn();
    manager.on("disconnect", handler);

    await manager.connect(client, session, WalletType.Paytaca);
    await manager.disconnect();

    expect(handler).toHaveBeenCalledOnce();
  });

  it("emits 'stateChange' events through the connection lifecycle", async () => {
    const states: WalletConnectionState[] = [];
    manager.on("stateChange", (s) => states.push(s));

    await manager.connect(client, session, WalletType.Paytaca);
    await manager.disconnect();

    expect(states).toContain(WalletConnectionState.Connecting);
    expect(states).toContain(WalletConnectionState.Connected);
    expect(states).toContain(WalletConnectionState.Disconnected);
  });

  it("emits 'error' and throws when connect fails", async () => {
    const failClient = makeClient({
      requestImpl: async () => { throw new Error("pairing failed"); },
    });
    const errorHandler = vi.fn();
    manager.on("error", errorHandler);

    await expect(
      manager.connect(failClient, session, WalletType.Paytaca)
    ).rejects.toThrow(MintCoreError);
    expect(errorHandler).toHaveBeenCalledOnce();
  });

  it("off() removes a listener", async () => {
    const handler = vi.fn();
    manager.on("connect", handler);
    manager.off("connect", handler);

    await manager.connect(client, session, WalletType.Paytaca);

    expect(handler).not.toHaveBeenCalled();
  });

  it("listener errors do not propagate through emit", async () => {
    manager.on("connect", () => { throw new Error("listener crash"); });

    await expect(
      manager.connect(client, session, WalletType.Paytaca)
    ).resolves.toBeDefined();
  });

  // ─── reconnect ─────────────────────────────────────────────────────────────

  it("reconnect() replaces the current session", async () => {
    await manager.connect(client, session, WalletType.Paytaca);

    const newAddress = "bitcoincash:qaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const newClient = makeClient({ requestImpl: async () => [newAddress] });
    const newSession = makeSession({ topic: "new-topic" });

    await manager.reconnect(newClient, newSession, WalletType.Cashonize);

    expect(manager.getSession()!.topic).toBe("new-topic");
    expect(manager.getSession()!.walletType).toBe(WalletType.Cashonize);
  });
});
