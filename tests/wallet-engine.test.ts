import { describe, it, expect, vi, beforeEach } from "vitest";
import { WalletClient, type BchWalletClientLike, type BchWalletSession } from "../src/wallet/WalletClient.js";
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
const TEST_SESSION_ID = "wizard-session-abc";

function makeClient(overrides?: {
  getAccountsImpl?: () => Promise<string[]>;
  signTransactionImpl?: (txHex: string, outputs: Array<{ satoshis: string; lockingBytecode: string }>) => Promise<string>;
  disconnectImpl?: () => Promise<void>;
}): BchWalletClientLike {
  return {
    getAccounts: vi.fn().mockImplementation(
      overrides?.getAccountsImpl ?? (async () => [MAINNET_ADDRESS])
    ),
    signTransaction: vi.fn().mockImplementation(
      overrides?.signTransactionImpl ?? (async () => SIGNED_TX_HEX)
    ),
    disconnect: vi.fn().mockImplementation(
      overrides?.disconnectImpl ?? (async () => undefined)
    ),
  };
}

function makeSession(overrides?: Partial<BchWalletSession>): BchWalletSession {
  return {
    id: TEST_SESSION_ID,
    expiry: Date.now() + 86_400_000,
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
          client: null as unknown as BchWalletClientLike,
          session: makeSession(),
          walletType: WalletType.Paytaca,
        })
    ).toThrow(MintCoreError);
  });

  it("throws when session id is empty", () => {
    expect(
      () =>
        new WalletClient({
          client: makeClient(),
          session: makeSession({ id: "  " }),
          walletType: WalletType.Cashonize,
        })
    ).toThrow(MintCoreError);
  });

  it("constructs successfully with valid options", () => {
    expect(() => makeWalletClient()).not.toThrow();
  });
});

// ─── WalletClient.getAddress ──────────────────────────────────────────────────

describe("WalletClient.getAddress", () => {
  it("calls getAccounts and returns the address", async () => {
    const client = makeClient({ getAccountsImpl: async () => [MAINNET_ADDRESS] });
    const wc = makeWalletClient(client);

    const addr = await wc.getAddress();

    expect(addr).toBe(MAINNET_ADDRESS);
    expect(client.getAccounts).toHaveBeenCalled();
  });

  it("caches the address after the first call", async () => {
    const client = makeClient({ getAccountsImpl: async () => [MAINNET_ADDRESS] });
    const wc = makeWalletClient(client);

    await wc.getAddress();
    await wc.getAddress();

    expect(client.getAccounts).toHaveBeenCalledTimes(1);
  });

  it("throws MintCoreError when getAccounts returns empty array", async () => {
    const client = makeClient({ getAccountsImpl: async () => [] });
    const wc = makeWalletClient(client);

    await expect(wc.getAddress()).rejects.toThrow(MintCoreError);
    await expect(wc.getAddress()).rejects.toThrow(/no accounts/i);
  });

  it("throws MintCoreError when getAccounts rejects", async () => {
    const client = makeClient({
      getAccountsImpl: async () => { throw new Error("connection lost"); },
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
    const client = makeClient({ getAccountsImpl: async () => [MAINNET_ADDRESS] });
    const session = makeSession();
    const wc = new WalletClient({
      client,
      session,
      walletType: WalletType.Paytaca,
      network: "mainnet",
    });

    const result = await wc.getSession();

    expect(result).not.toBeNull();
    expect(result!.id).toBe(TEST_SESSION_ID);
    expect(result!.address).toBe(MAINNET_ADDRESS);
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

  it("calls signTransaction on the client and returns signed hex", async () => {
    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const wc = makeWalletClient(client);

    const result = await wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    expect(result).toBe(SIGNED_TX_HEX);
    expect(client.signTransaction).toHaveBeenCalledWith(
      UNSIGNED_TX_HEX,
      expect.arrayContaining([
        expect.objectContaining({ satoshis: "100000", lockingBytecode: "76a914" }),
      ])
    );
  });

  it("serialises satoshis as a string", async () => {
    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const wc = makeWalletClient(client);

    await wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    const call = (client.signTransaction as ReturnType<typeof vi.fn>).mock.calls[0];
    const outputs = call[1] as Array<{ satoshis: string }>;
    expect(typeof outputs[0].satoshis).toBe("string");
    expect(outputs[0].satoshis).toBe("100000");
  });

  it("serialises lockingBytecode as lowercase hex (using src/utils/hex.ts toHex)", async () => {
    const client = makeClient({ signTransactionImpl: async () => SIGNED_TX_HEX });
    const wc = makeWalletClient(client);

    await wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS);

    const call = (client.signTransaction as ReturnType<typeof vi.fn>).mock.calls[0];
    const outputs = call[1] as Array<{ lockingBytecode: string }>;
    expect(outputs[0].lockingBytecode).toBe("76a914");
  });

  it("throws MintCoreError when wallet returns an empty string", async () => {
    const client = makeClient({ signTransactionImpl: async () => "" });
    const wc = makeWalletClient(client);

    await expect(wc.signTransaction(UNSIGNED_TX_HEX, SOURCE_OUTPUTS)).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when signTransaction rejects", async () => {
    const client = makeClient({
      signTransactionImpl: async () => { throw new Error("user rejected"); },
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

// ─── WalletClient.disconnect ──────────────────────────────────────────────────

describe("WalletClient.disconnect", () => {
  it("calls client.disconnect", async () => {
    const client = makeClient();
    const wc = makeWalletClient(client);

    await wc.disconnect();

    expect(client.disconnect).toHaveBeenCalled();
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
  let client: BchWalletClientLike;
  let session: BchWalletSession;
  let manager: WalletManager;

  beforeEach(() => {
    client = makeClient({ getAccountsImpl: async () => [MAINNET_ADDRESS] });
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

    expect(result.id).toBe(TEST_SESSION_ID);
    expect(result.address).toBe(MAINNET_ADDRESS);
    expect(result.walletType).toBe(WalletType.Paytaca);
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
    const sigClient = makeClient({
      getAccountsImpl: async () => [MAINNET_ADDRESS],
      signTransactionImpl: async () => SIGNED_TX_HEX,
    });
    await manager.connect(sigClient, session, WalletType.Paytaca);

    const result = await manager.signTransaction(UNSIGNED_TX_HEX, [
      { satoshis: 1000n, lockingBytecode: new Uint8Array([0x76]) },
    ]);
    expect(result).toBe(SIGNED_TX_HEX);
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
      getAccountsImpl: async () => { throw new Error("pairing failed"); },
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
    const newClient = makeClient({ getAccountsImpl: async () => [newAddress] });
    const newSession = makeSession({ id: "new-session-id" });

    await manager.reconnect(newClient, newSession, WalletType.Cashonize);

    expect(manager.getSession()!.id).toBe("new-session-id");
    expect(manager.getSession()!.walletType).toBe(WalletType.Cashonize);
  });
});
