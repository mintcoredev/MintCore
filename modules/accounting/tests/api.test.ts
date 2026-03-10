import { describe, it, expect, beforeEach } from "vitest";
import { AccountingAPI } from "../api/accountingAPI.js";
import { ValidationError } from "../models/errors.js";
import {
  createMaxSupplyRule,
  createSoulboundRule,
  createMintAuthorityRule,
} from "../rules/ruleDefinitions.js";

describe("AccountingAPI — mint", () => {
  let api: AccountingAPI;

  beforeEach(() => {
    api = new AccountingAPI();
  });

  it("returns a MINT event", () => {
    const event = api.mint("GOLD", "alice", 100n);
    expect(event.type).toBe("MINT");
    expect(event.asset).toBe("GOLD");
    expect(event.to).toBe("alice");
    expect(event.amount).toBe(100n);
  });

  it("increases balance after mint", () => {
    api.mint("GOLD", "alice", 100n);
    expect(api.getBalance("alice", "GOLD")).toBe(100n);
  });

  it("increases supply after mint", () => {
    api.mint("GOLD", "alice", 100n);
    expect(api.getSupply("GOLD")).toBe(100n);
  });

  it("registers holder after mint", () => {
    api.mint("GOLD", "alice", 100n);
    expect(api.getHolders("GOLD")).toContain("alice");
  });

  it("records mint in history", () => {
    api.mint("GOLD", "alice", 100n);
    expect(api.getHistory("alice")).toHaveLength(1);
  });

  it("throws when max supply is exceeded", () => {
    api.addRule(createMaxSupplyRule("GOLD", 50n));
    expect(() => api.mint("GOLD", "alice", 100n)).toThrow(ValidationError);
  });

  it("passes metadata to the event", () => {
    const event = api.mint("GOLD", "alice", 10n, { note: "genesis" });
    expect(event.metadata?.["note"]).toBe("genesis");
  });
});

describe("AccountingAPI — transfer", () => {
  let api: AccountingAPI;

  beforeEach(() => {
    api = new AccountingAPI();
    api.mint("GOLD", "alice", 100n);
  });

  it("returns a TRANSFER event", () => {
    const event = api.transfer("GOLD", "alice", "bob", 40n);
    expect(event.type).toBe("TRANSFER");
    expect(event.from).toBe("alice");
    expect(event.to).toBe("bob");
  });

  it("updates balances after transfer", () => {
    api.transfer("GOLD", "alice", "bob", 40n);
    expect(api.getBalance("alice", "GOLD")).toBe(60n);
    expect(api.getBalance("bob", "GOLD")).toBe(40n);
  });

  it("throws when balance is insufficient", () => {
    expect(() => api.transfer("GOLD", "alice", "bob", 200n)).toThrow(
      ValidationError,
    );
  });

  it("throws for soulbound asset", () => {
    api.addRule(createSoulboundRule("GOLD"));
    expect(() => api.transfer("GOLD", "alice", "bob", 10n)).toThrow(
      ValidationError,
    );
  });
});

describe("AccountingAPI — burn", () => {
  let api: AccountingAPI;

  beforeEach(() => {
    api = new AccountingAPI();
    api.mint("GOLD", "alice", 100n);
  });

  it("returns a BURN event", () => {
    const event = api.burn("GOLD", "alice", 30n);
    expect(event.type).toBe("BURN");
    expect(event.amount).toBe(30n);
  });

  it("reduces balance after burn", () => {
    api.burn("GOLD", "alice", 30n);
    expect(api.getBalance("alice", "GOLD")).toBe(70n);
  });

  it("reduces supply after burn", () => {
    api.burn("GOLD", "alice", 30n);
    expect(api.getSupply("GOLD")).toBe(70n);
  });

  it("throws when burning more than balance", () => {
    expect(() => api.burn("GOLD", "alice", 200n)).toThrow(ValidationError);
  });
});

describe("AccountingAPI — reward", () => {
  let api: AccountingAPI;

  beforeEach(() => {
    api = new AccountingAPI();
  });

  it("returns a REWARD event", () => {
    const event = api.reward("quest-1", "alice", "GOLD", 50n);
    expect(event.type).toBe("REWARD");
    expect(event.to).toBe("alice");
    expect(event.amount).toBe(50n);
  });

  it("increases balance after reward", () => {
    api.reward("quest-1", "alice", "GOLD", 50n);
    expect(api.getBalance("alice", "GOLD")).toBe(50n);
  });
});

describe("AccountingAPI — collectFee", () => {
  let api: AccountingAPI;

  beforeEach(() => {
    api = new AccountingAPI();
    api.mint("GOLD", "alice", 100n);
  });

  it("returns a FEE event", () => {
    const event = api.collectFee("GOLD", "alice", 5n, "treasury");
    expect(event.type).toBe("FEE");
    expect(event.from).toBe("alice");
    expect(event.to).toBe("treasury");
  });

  it("deducts fee from sender", () => {
    api.collectFee("GOLD", "alice", 5n);
    expect(api.getBalance("alice", "GOLD")).toBe(95n);
  });

  it("throws when balance is insufficient for fee", () => {
    expect(() => api.collectFee("GOLD", "alice", 200n)).toThrow(ValidationError);
  });
});

describe("AccountingAPI — getInventory", () => {
  it("returns all non-zero balances for an address", () => {
    const api = new AccountingAPI();
    api.mint("GOLD", "alice", 100n);
    api.mint("SILVER", "alice", 50n);
    const inv = api.getInventory("alice");
    expect(inv).toHaveLength(2);
    expect(inv.map((b) => b.asset).sort()).toEqual(["GOLD", "SILVER"]);
  });

  it("returns empty array when address has no balance", () => {
    const api = new AccountingAPI();
    expect(api.getInventory("nobody")).toEqual([]);
  });
});

describe("AccountingAPI — rules lifecycle", () => {
  it("addRule and removeRule work together", () => {
    const api = new AccountingAPI();
    const rule = createMaxSupplyRule("GOLD", 50n);
    api.addRule(rule);
    expect(() => api.mint("GOLD", "alice", 100n)).toThrow(ValidationError);
    api.removeRule(rule.id);
    expect(() => api.mint("GOLD", "alice", 100n)).not.toThrow();
  });

  it("mint authority rule blocks unauthorized minters", () => {
    const api = new AccountingAPI();
    api.addRule(createMintAuthorityRule("GOLD", "treasury"));
    // No 'from' – not authorized
    expect(() => api.mint("GOLD", "alice", 100n)).toThrow(ValidationError);
  });
});

describe("AccountingAPI — full workflow", () => {
  it("mint → transfer → burn lifecycle", () => {
    const api = new AccountingAPI();
    api.mint("GOLD", "alice", 1000n);
    api.transfer("GOLD", "alice", "bob", 300n);
    api.burn("GOLD", "alice", 200n);

    expect(api.getBalance("alice", "GOLD")).toBe(500n);
    expect(api.getBalance("bob", "GOLD")).toBe(300n);
    expect(api.getSupply("GOLD")).toBe(800n);
  });

  it("history accumulates events chronologically", () => {
    const api = new AccountingAPI();
    api.mint("GOLD", "alice", 100n);
    api.transfer("GOLD", "alice", "bob", 50n);
    const history = api.getHistory("alice");
    expect(history).toHaveLength(2);
    expect(history[0]!.type).toBe("MINT");
    expect(history[1]!.type).toBe("TRANSFER");
  });
});
