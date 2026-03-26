import { describe, it, expect } from "vitest";
import { WizardAdapter, type WizardAdapterClientLike } from "../../src/wallet/adapters/WizardAdapter.js";
import { MintCoreError } from "../../src/utils/errors.js";

const makeClient = (): WizardAdapterClientLike => ({
  getAccounts: async () => ["bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd"],
  signTransaction: async () => "deadbeef",
  disconnect: async () => undefined,
});

describe("Adapter invariants", () => {
  it("WizardAdapter must reject null client", () => {
    // @ts-expect-error intentional misuse
    expect(() => new WizardAdapter({ client: null })).toThrow(MintCoreError);
  });

  it("validate() must throw if invariant is violated", () => {
    const adapter = new WizardAdapter({ client: makeClient() });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adapter as any).client = null;
    expect(() => adapter.validate()).toThrow(MintCoreError);
  });
});
