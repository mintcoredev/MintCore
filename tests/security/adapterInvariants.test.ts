import { describe, it, expect } from "vitest";
import { BaseWalletAdapter, type WalletAdapterClientLike } from "../../src/wallet/adapters/BaseWalletAdapter.js";
import { MintCoreError } from "../../src/utils/errors.js";

const makeClient = (): WalletAdapterClientLike => ({
  getAccounts: async () => ["bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd"],
  signTransaction: async () => "deadbeef",
  disconnect: async () => undefined,
});

describe("Adapter invariants", () => {
  it("BaseWalletAdapter must reject null client", () => {
    // @ts-expect-error intentional misuse
    expect(() => new BaseWalletAdapter({ client: null as unknown as WalletAdapterClientLike })).toThrow(MintCoreError);
  });

  it("validate() must throw if invariant is violated", () => {
    const adapter = new BaseWalletAdapter({ client: makeClient() });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adapter as any).client = null;
    expect(() => adapter.validate()).toThrow(MintCoreError);
  });
});
