import { describe, it, expect, beforeEach } from "vitest";
import { Ledger } from "../ledger/ledger.js";
import { BalanceEngine } from "../balances/balanceEngine.js";
import { SupplyEngine } from "../balances/supplyEngine.js";
import { RuleEngine } from "../rules/ruleEngine.js";
import { MintService } from "../services/mintService.js";
import { TransferService } from "../services/transferService.js";
import { BurnService } from "../services/burnService.js";
import { RewardService } from "../services/rewardService.js";
import { FeeService } from "../services/feeService.js";
import { ValidationError } from "../models/errors.js";
import {
  createMaxSupplyRule,
  createSoulboundRule,
  createQuestRewardRule,
} from "../rules/ruleDefinitions.js";

function makeContext() {
  const ledger = new Ledger();
  const balanceEngine = new BalanceEngine();
  const supplyEngine = new SupplyEngine();
  const ruleEngine = new RuleEngine();
  return { ledger, balanceEngine, supplyEngine, ruleEngine };
}

describe("MintService", () => {
  it("creates a MINT event with correct fields", () => {
    const ctx = makeContext();
    const service = new MintService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    const event = service.mint({ asset: "GOLD", to: "alice", amount: 100n });
    expect(event.type).toBe("MINT");
    expect(event.asset).toBe("GOLD");
    expect(event.to).toBe("alice");
    expect(event.amount).toBe(100n);
    expect(event.id).toBeTypeOf("string");
  });

  it("appends event to ledger", () => {
    const ctx = makeContext();
    const service = new MintService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    service.mint({ asset: "GOLD", to: "alice", amount: 100n });
    expect(ctx.ledger.getEvents()).toHaveLength(1);
  });

  it("updates balance engine", () => {
    const ctx = makeContext();
    const service = new MintService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    service.mint({ asset: "GOLD", to: "alice", amount: 100n });
    expect(ctx.balanceEngine.getBalance("alice", "GOLD")).toBe(100n);
  });

  it("updates supply engine", () => {
    const ctx = makeContext();
    const service = new MintService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    service.mint({ asset: "GOLD", to: "alice", amount: 100n });
    expect(ctx.supplyEngine.getSupply("GOLD")).toBe(100n);
  });

  it("throws when max supply rule is violated", () => {
    const ctx = makeContext();
    ctx.ruleEngine.addRule(createMaxSupplyRule("GOLD", 50n));
    const service = new MintService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    expect(() =>
      service.mint({ asset: "GOLD", to: "alice", amount: 100n }),
    ).toThrow(ValidationError);
  });
});

describe("TransferService", () => {
  it("creates a TRANSFER event", () => {
    const ctx = makeContext();
    const mintSvc = new MintService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    mintSvc.mint({ asset: "GOLD", to: "alice", amount: 100n });

    const transferSvc = new TransferService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.ruleEngine,
    );
    const event = transferSvc.transfer({
      asset: "GOLD",
      from: "alice",
      to: "bob",
      amount: 40n,
    });
    expect(event.type).toBe("TRANSFER");
    expect(event.from).toBe("alice");
    expect(event.to).toBe("bob");
  });

  it("updates balances after transfer", () => {
    const ctx = makeContext();
    new MintService(ctx.ledger, ctx.balanceEngine, ctx.supplyEngine, ctx.ruleEngine).mint(
      { asset: "GOLD", to: "alice", amount: 100n },
    );
    new TransferService(ctx.ledger, ctx.balanceEngine, ctx.ruleEngine).transfer({
      asset: "GOLD",
      from: "alice",
      to: "bob",
      amount: 40n,
    });
    expect(ctx.balanceEngine.getBalance("alice", "GOLD")).toBe(60n);
    expect(ctx.balanceEngine.getBalance("bob", "GOLD")).toBe(40n);
  });

  it("throws ValidationError for insufficient balance", () => {
    const ctx = makeContext();
    const svc = new TransferService(ctx.ledger, ctx.balanceEngine, ctx.ruleEngine);
    expect(() =>
      svc.transfer({ asset: "GOLD", from: "alice", to: "bob", amount: 1n }),
    ).toThrow(ValidationError);
  });

  it("throws ValidationError for soulbound asset", () => {
    const ctx = makeContext();
    ctx.ruleEngine.addRule(createSoulboundRule("GOLD"));
    new MintService(ctx.ledger, ctx.balanceEngine, ctx.supplyEngine, ctx.ruleEngine).mint(
      { asset: "GOLD", to: "alice", amount: 100n },
    );
    const svc = new TransferService(ctx.ledger, ctx.balanceEngine, ctx.ruleEngine);
    expect(() =>
      svc.transfer({ asset: "GOLD", from: "alice", to: "bob", amount: 10n }),
    ).toThrow(ValidationError);
  });
});

describe("BurnService", () => {
  it("creates a BURN event", () => {
    const ctx = makeContext();
    new MintService(ctx.ledger, ctx.balanceEngine, ctx.supplyEngine, ctx.ruleEngine).mint(
      { asset: "GOLD", to: "alice", amount: 100n },
    );
    const svc = new BurnService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    const event = svc.burn({ asset: "GOLD", from: "alice", amount: 30n });
    expect(event.type).toBe("BURN");
    expect(event.amount).toBe(30n);
  });

  it("reduces supply on burn", () => {
    const ctx = makeContext();
    new MintService(ctx.ledger, ctx.balanceEngine, ctx.supplyEngine, ctx.ruleEngine).mint(
      { asset: "GOLD", to: "alice", amount: 100n },
    );
    new BurnService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    ).burn({ asset: "GOLD", from: "alice", amount: 30n });
    expect(ctx.supplyEngine.getSupply("GOLD")).toBe(70n);
  });

  it("throws ValidationError when burning more than balance", () => {
    const ctx = makeContext();
    const svc = new BurnService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    expect(() =>
      svc.burn({ asset: "GOLD", from: "alice", amount: 1n }),
    ).toThrow(ValidationError);
  });
});

describe("RewardService", () => {
  it("creates a REWARD event", () => {
    const ctx = makeContext();
    const svc = new RewardService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    const event = svc.reward({
      ruleId: "quest-1",
      asset: "GOLD",
      to: "alice",
      amount: 50n,
    });
    expect(event.type).toBe("REWARD");
    expect(event.to).toBe("alice");
    expect(event.amount).toBe(50n);
  });

  it("embeds ruleId in metadata", () => {
    const ctx = makeContext();
    const svc = new RewardService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    const event = svc.reward({
      ruleId: "quest-1",
      asset: "GOLD",
      to: "alice",
      amount: 50n,
    });
    expect(event.metadata?.["ruleId"]).toBe("quest-1");
  });

  it("throws when reward amount violates quest rule", () => {
    const ctx = makeContext();
    ctx.ruleEngine.addRule(createQuestRewardRule("quest-1", "GOLD", 50n));
    const svc = new RewardService(
      ctx.ledger,
      ctx.balanceEngine,
      ctx.supplyEngine,
      ctx.ruleEngine,
    );
    expect(() =>
      svc.reward({ ruleId: "quest-1", asset: "GOLD", to: "alice", amount: 99n }),
    ).toThrow(ValidationError);
  });
});

describe("FeeService", () => {
  it("creates a FEE event", () => {
    const ctx = makeContext();
    new MintService(ctx.ledger, ctx.balanceEngine, ctx.supplyEngine, ctx.ruleEngine).mint(
      { asset: "GOLD", to: "alice", amount: 100n },
    );
    const svc = new FeeService(ctx.ledger, ctx.balanceEngine);
    const event = svc.collectFee({
      asset: "GOLD",
      from: "alice",
      amount: 5n,
      collector: "treasury",
    });
    expect(event.type).toBe("FEE");
    expect(event.from).toBe("alice");
    expect(event.to).toBe("treasury");
    expect(event.amount).toBe(5n);
  });

  it("deducts fee from sender balance", () => {
    const ctx = makeContext();
    new MintService(ctx.ledger, ctx.balanceEngine, ctx.supplyEngine, ctx.ruleEngine).mint(
      { asset: "GOLD", to: "alice", amount: 100n },
    );
    new FeeService(ctx.ledger, ctx.balanceEngine).collectFee({
      asset: "GOLD",
      from: "alice",
      amount: 5n,
    });
    expect(ctx.balanceEngine.getBalance("alice", "GOLD")).toBe(95n);
  });

  it("throws ValidationError when balance is insufficient for fee", () => {
    const ctx = makeContext();
    const svc = new FeeService(ctx.ledger, ctx.balanceEngine);
    expect(() =>
      svc.collectFee({ asset: "GOLD", from: "alice", amount: 1n }),
    ).toThrow(ValidationError);
  });
});
