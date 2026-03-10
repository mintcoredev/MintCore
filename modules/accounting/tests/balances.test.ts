import { describe, it, expect, beforeEach } from "vitest";
import { BalanceEngine } from "../balances/balanceEngine.js";
import { SupplyEngine } from "../balances/supplyEngine.js";
import { OwnershipEngine } from "../balances/ownershipEngine.js";
import { HistoryEngine } from "../balances/historyEngine.js";
import type { Event } from "../models/event.js";

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "evt-1",
  type: "MINT",
  asset: "GOLD",
  to: "alice",
  amount: 100n,
  timestamp: 1000,
  ...overrides,
});

describe("BalanceEngine", () => {
  let engine: BalanceEngine;

  beforeEach(() => {
    engine = new BalanceEngine();
  });

  it("starts with zero balance", () => {
    expect(engine.getBalance("alice", "GOLD")).toBe(0n);
  });

  it("increases balance on MINT event", () => {
    engine.applyEvent(makeEvent({ type: "MINT", to: "alice", amount: 50n }));
    expect(engine.getBalance("alice", "GOLD")).toBe(50n);
  });

  it("accumulates multiple mints", () => {
    engine.applyEvent(makeEvent({ id: "1", type: "MINT", to: "alice", amount: 50n }));
    engine.applyEvent(makeEvent({ id: "2", type: "MINT", to: "alice", amount: 30n }));
    expect(engine.getBalance("alice", "GOLD")).toBe(80n);
  });

  it("transfers balance between addresses", () => {
    engine.applyEvent(makeEvent({ type: "MINT", to: "alice", amount: 100n }));
    engine.applyEvent(
      makeEvent({ id: "2", type: "TRANSFER", from: "alice", to: "bob", amount: 40n }),
    );
    expect(engine.getBalance("alice", "GOLD")).toBe(60n);
    expect(engine.getBalance("bob", "GOLD")).toBe(40n);
  });

  it("reduces balance on BURN event", () => {
    engine.applyEvent(makeEvent({ type: "MINT", to: "alice", amount: 100n }));
    engine.applyEvent(makeEvent({ id: "2", type: "BURN", from: "alice", to: undefined, amount: 30n }));
    expect(engine.getBalance("alice", "GOLD")).toBe(70n);
  });

  it("reduces balance on FEE event", () => {
    engine.applyEvent(makeEvent({ type: "MINT", to: "alice", amount: 100n }));
    engine.applyEvent(
      makeEvent({ id: "2", type: "FEE", from: "alice", to: "treasury", amount: 5n }),
    );
    expect(engine.getBalance("alice", "GOLD")).toBe(95n);
    expect(engine.getBalance("treasury", "GOLD")).toBe(5n);
  });

  it("tracks multiple assets independently", () => {
    engine.applyEvent(makeEvent({ asset: "GOLD", to: "alice", amount: 100n }));
    engine.applyEvent(makeEvent({ id: "2", asset: "SILVER", to: "alice", amount: 200n }));
    expect(engine.getBalance("alice", "GOLD")).toBe(100n);
    expect(engine.getBalance("alice", "SILVER")).toBe(200n);
  });

  it("getAllBalances returns all non-zero entries", () => {
    engine.applyEvent(makeEvent({ asset: "GOLD", to: "alice", amount: 100n }));
    engine.applyEvent(makeEvent({ id: "2", asset: "SILVER", to: "bob", amount: 50n }));
    const balances = engine.getAllBalances();
    expect(balances).toHaveLength(2);
  });
});

describe("BalanceEngine — edge cases", () => {
  let engine: BalanceEngine;

  beforeEach(() => {
    engine = new BalanceEngine();
  });

  it("returns 0n for an unknown address", () => {
    expect(engine.getBalance("nobody", "GOLD")).toBe(0n);
  });

  it("returns 0n for an unknown asset", () => {
    engine.applyEvent(makeEvent({ to: "alice", asset: "GOLD", amount: 100n }));
    expect(engine.getBalance("alice", "SILVER")).toBe(0n);
  });

  it("handles very large amounts (bigint safety)", () => {
    const large = BigInt("999999999999999999999999999999");
    engine.applyEvent(makeEvent({ to: "alice", amount: large }));
    expect(engine.getBalance("alice", "GOLD")).toBe(large);
  });

  it("handles zero-amount MINT event without error", () => {
    engine.applyEvent(makeEvent({ to: "alice", amount: 0n }));
    expect(engine.getBalance("alice", "GOLD")).toBe(0n);
  });

  it("applies credit ADJUSTMENT event", () => {
    engine.applyEvent(makeEvent({ id: "adj-1", type: "ADJUSTMENT", to: "alice", from: undefined, amount: 50n }));
    expect(engine.getBalance("alice", "GOLD")).toBe(50n);
  });

  it("applies debit ADJUSTMENT event", () => {
    engine.applyEvent(makeEvent({ type: "MINT", to: "alice", amount: 100n }));
    engine.applyEvent(makeEvent({ id: "adj-1", type: "ADJUSTMENT", from: "alice", to: undefined, amount: 30n }));
    expect(engine.getBalance("alice", "GOLD")).toBe(70n);
  });
});

describe("SupplyEngine — edge cases", () => {
  let engine: SupplyEngine;

  beforeEach(() => {
    engine = new SupplyEngine();
  });

  it("returns 0n for unknown asset supply", () => {
    expect(engine.getSupply("UNKNOWN")).toBe(0n);
  });

  it("credit ADJUSTMENT increases supply", () => {
    engine.applyEvent(makeEvent({ type: "ADJUSTMENT", to: "alice", from: undefined, amount: 50n }));
    expect(engine.getSupply("GOLD")).toBe(50n);
    expect(engine.getMinted("GOLD")).toBe(50n);
  });

  it("debit ADJUSTMENT decreases supply", () => {
    engine.applyEvent(makeEvent({ type: "MINT", amount: 100n }));
    engine.applyEvent(makeEvent({ id: "2", type: "ADJUSTMENT", from: "alice", to: undefined, amount: 30n }));
    expect(engine.getSupply("GOLD")).toBe(70n);
    expect(engine.getBurned("GOLD")).toBe(30n);
  });

  it("ADJUSTMENT with neither to nor from does not change supply", () => {
    engine.applyEvent(makeEvent({ type: "MINT", amount: 100n }));
    engine.applyEvent(makeEvent({ id: "2", type: "ADJUSTMENT", from: undefined, to: undefined, amount: 10n }));
    expect(engine.getSupply("GOLD")).toBe(100n);
  });
});

describe("SupplyEngine", () => {
  let engine: SupplyEngine;

  beforeEach(() => {
    engine = new SupplyEngine();
  });

  it("starts with zero supply", () => {
    expect(engine.getSupply("GOLD")).toBe(0n);
  });

  it("increases supply on MINT event", () => {
    engine.applyEvent(makeEvent({ type: "MINT", amount: 1000n }));
    expect(engine.getSupply("GOLD")).toBe(1000n);
  });

  it("decreases supply on BURN event", () => {
    engine.applyEvent(makeEvent({ type: "MINT", amount: 1000n }));
    engine.applyEvent(makeEvent({ id: "2", type: "BURN", from: "alice", amount: 200n }));
    expect(engine.getSupply("GOLD")).toBe(800n);
  });

  it("increases supply on REWARD event", () => {
    engine.applyEvent(makeEvent({ type: "REWARD", amount: 50n }));
    expect(engine.getSupply("GOLD")).toBe(50n);
    expect(engine.getMinted("GOLD")).toBe(50n);
  });

  it("TRANSFER does not affect supply", () => {
    engine.applyEvent(makeEvent({ type: "MINT", amount: 100n }));
    engine.applyEvent(
      makeEvent({ id: "2", type: "TRANSFER", from: "alice", to: "bob", amount: 50n }),
    );
    expect(engine.getSupply("GOLD")).toBe(100n);
  });

  it("tracks minted and burned separately", () => {
    engine.applyEvent(makeEvent({ type: "MINT", amount: 500n }));
    engine.applyEvent(makeEvent({ id: "2", type: "BURN", from: "alice", amount: 100n }));
    expect(engine.getMinted("GOLD")).toBe(500n);
    expect(engine.getBurned("GOLD")).toBe(100n);
    expect(engine.getSupply("GOLD")).toBe(400n);
  });
});

describe("OwnershipEngine", () => {
  let engine: OwnershipEngine;

  beforeEach(() => {
    engine = new OwnershipEngine();
  });

  it("starts with no holders", () => {
    expect(engine.getHolders("GOLD")).toEqual([]);
  });

  it("registers holder on MINT", () => {
    engine.applyEvent(makeEvent({ to: "alice", amount: 10n }));
    expect(engine.getHolders("GOLD")).toContain("alice");
  });

  it("registers multiple holders", () => {
    engine.applyEvent(makeEvent({ id: "1", to: "alice", amount: 10n }));
    engine.applyEvent(makeEvent({ id: "2", to: "bob", amount: 5n }));
    expect(engine.getHolders("GOLD")).toHaveLength(2);
  });

  it("does not duplicate the same holder", () => {
    engine.applyEvent(makeEvent({ id: "1", to: "alice", amount: 10n }));
    engine.applyEvent(makeEvent({ id: "2", to: "alice", amount: 5n }));
    expect(engine.getHolders("GOLD")).toHaveLength(1);
  });

  it("ignores events with zero amount", () => {
    engine.applyEvent(makeEvent({ to: "alice", amount: 0n }));
    expect(engine.getHolders("GOLD")).toHaveLength(0);
  });
});

describe("HistoryEngine", () => {
  let engine: HistoryEngine;

  beforeEach(() => {
    engine = new HistoryEngine();
  });

  it("starts with empty history", () => {
    expect(engine.getHistory("alice")).toEqual([]);
  });

  it("records event in recipient history", () => {
    const event = makeEvent({ to: "alice" });
    engine.applyEvent(event);
    expect(engine.getHistory("alice")).toHaveLength(1);
  });

  it("records event in sender history", () => {
    const event = makeEvent({ type: "TRANSFER", from: "alice", to: "bob" });
    engine.applyEvent(event);
    expect(engine.getHistory("alice")).toHaveLength(1);
    expect(engine.getHistory("bob")).toHaveLength(1);
  });

  it("returns a copy so internal state is not mutated", () => {
    engine.applyEvent(makeEvent());
    const history = engine.getHistory("alice");
    history.pop();
    expect(engine.getHistory("alice")).toHaveLength(1);
  });

  it("maintains chronological order", () => {
    engine.applyEvent(makeEvent({ id: "1", timestamp: 100, to: "alice" }));
    engine.applyEvent(makeEvent({ id: "2", timestamp: 200, to: "alice" }));
    const history = engine.getHistory("alice");
    expect(history[0]!.id).toBe("1");
    expect(history[1]!.id).toBe("2");
  });
});
