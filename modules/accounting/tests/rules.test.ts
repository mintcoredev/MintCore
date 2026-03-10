import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../rules/ruleEngine.js";
import {
  createMaxSupplyRule,
  createMintAuthorityRule,
  createSoulboundRule,
  createQuestRewardRule,
  createCooldownRule,
  createRoyaltyRule,
  createXpThresholdRule,
} from "../rules/ruleDefinitions.js";
import { ValidationError } from "../models/errors.js";
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

describe("RuleEngine", () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
  });

  it("starts with no rules", () => {
    expect(engine.getRules()).toHaveLength(0);
  });

  it("adds a rule", () => {
    engine.addRule(createMaxSupplyRule("GOLD", 1000n));
    expect(engine.getRules()).toHaveLength(1);
  });

  it("removes a rule by id", () => {
    const rule = createMaxSupplyRule("GOLD", 1000n);
    engine.addRule(rule);
    engine.removeRule(rule.id);
    expect(engine.getRules()).toHaveLength(0);
  });

  it("passes validation with no rules", () => {
    expect(() => engine.validate(makeEvent())).not.toThrow();
  });
});

describe("mintValidator", () => {
  it("passes when mint is within max supply", () => {
    const engine = new RuleEngine();
    engine.addRule(createMaxSupplyRule("GOLD", 1000n));
    expect(() =>
      engine.validate(makeEvent({ amount: 100n }), { currentSupply: 500n }),
    ).not.toThrow();
  });

  it("throws ValidationError when mint exceeds max supply", () => {
    const engine = new RuleEngine();
    engine.addRule(createMaxSupplyRule("GOLD", 1000n));
    expect(() =>
      engine.validate(makeEvent({ amount: 600n }), { currentSupply: 500n }),
    ).toThrow(ValidationError);
  });

  it("passes when mint hits exactly max supply", () => {
    const engine = new RuleEngine();
    engine.addRule(createMaxSupplyRule("GOLD", 1000n));
    expect(() =>
      engine.validate(makeEvent({ amount: 500n }), { currentSupply: 500n }),
    ).not.toThrow();
  });

  it("passes when from matches mint authority", () => {
    const engine = new RuleEngine();
    engine.addRule(createMintAuthorityRule("GOLD", "treasury"));
    expect(() =>
      engine.validate(makeEvent({ from: "treasury" })),
    ).not.toThrow();
  });

  it("throws ValidationError when minter is not authorized", () => {
    const engine = new RuleEngine();
    engine.addRule(createMintAuthorityRule("GOLD", "treasury"));
    expect(() =>
      engine.validate(makeEvent({ from: "eve" })),
    ).toThrow(ValidationError);
  });

  it("does not apply rules for a different asset", () => {
    const engine = new RuleEngine();
    engine.addRule(createMaxSupplyRule("SILVER", 100n));
    expect(() =>
      engine.validate(makeEvent({ asset: "GOLD", amount: 999n }), { currentSupply: 0n }),
    ).not.toThrow();
  });
});

describe("transferValidator", () => {
  it("allows transfer when no soulbound rule", () => {
    const engine = new RuleEngine();
    expect(() =>
      engine.validate(makeEvent({ type: "TRANSFER", from: "alice", to: "bob" })),
    ).not.toThrow();
  });

  it("throws ValidationError for soulbound asset transfer", () => {
    const engine = new RuleEngine();
    engine.addRule(createSoulboundRule("GOLD"));
    expect(() =>
      engine.validate(makeEvent({ type: "TRANSFER", from: "alice", to: "bob" })),
    ).toThrow(ValidationError);
  });

  it("soulbound rule does not affect other assets", () => {
    const engine = new RuleEngine();
    engine.addRule(createSoulboundRule("SILVER"));
    expect(() =>
      engine.validate(makeEvent({ type: "TRANSFER", asset: "GOLD", from: "alice", to: "bob" })),
    ).not.toThrow();
  });
});

describe("burnValidator", () => {
  it("allows burn when balance is sufficient", () => {
    const engine = new RuleEngine();
    expect(() =>
      engine.validate(makeEvent({ type: "BURN", from: "alice", amount: 50n }), {
        currentBalance: 100n,
      }),
    ).not.toThrow();
  });

  it("throws ValidationError when balance is insufficient for burn", () => {
    const engine = new RuleEngine();
    expect(() =>
      engine.validate(makeEvent({ type: "BURN", from: "alice", amount: 200n }), {
        currentBalance: 100n,
      }),
    ).toThrow(ValidationError);
  });

  it("allows exact balance burn", () => {
    const engine = new RuleEngine();
    expect(() =>
      engine.validate(makeEvent({ type: "BURN", from: "alice", amount: 100n }), {
        currentBalance: 100n,
      }),
    ).not.toThrow();
  });
});

describe("rewardValidator", () => {
  it("passes when reward matches quest rule amount", () => {
    const engine = new RuleEngine();
    engine.addRule(createQuestRewardRule("quest-1", "GOLD", 50n));
    expect(() =>
      engine.validate(makeEvent({ type: "REWARD", asset: "GOLD", amount: 50n })),
    ).not.toThrow();
  });

  it("throws ValidationError when reward does not match quest rule amount", () => {
    const engine = new RuleEngine();
    engine.addRule(createQuestRewardRule("quest-1", "GOLD", 50n));
    expect(() =>
      engine.validate(makeEvent({ type: "REWARD", asset: "GOLD", amount: 99n })),
    ).toThrow(ValidationError);
  });

  it("passes when no quest rule exists for the asset", () => {
    const engine = new RuleEngine();
    expect(() =>
      engine.validate(makeEvent({ type: "REWARD", asset: "GOLD", amount: 99n })),
    ).not.toThrow();
  });
});

describe("ruleDefinitions factory functions", () => {
  it("createMaxSupplyRule sets correct fields", () => {
    const rule = createMaxSupplyRule("GOLD", 500n);
    expect(rule.type).toBe("MAX_SUPPLY");
    expect(rule.asset).toBe("GOLD");
    expect(rule.params["maxSupply"]).toBe(500n);
  });

  it("createMintAuthorityRule sets correct fields", () => {
    const rule = createMintAuthorityRule("GOLD", "treasury");
    expect(rule.type).toBe("MINT_AUTHORITY");
    expect(rule.params["authority"]).toBe("treasury");
  });

  it("createSoulboundRule sets correct fields", () => {
    const rule = createSoulboundRule("GOLD");
    expect(rule.type).toBe("SOULBOUND");
    expect(rule.asset).toBe("GOLD");
  });

  it("createCooldownRule sets cooldownMs param", () => {
    const rule = createCooldownRule("GOLD", 3000);
    expect(rule.type).toBe("COOLDOWN");
    expect(rule.params["cooldownMs"]).toBe(3000);
  });

  it("createRoyaltyRule sets basisPoints and recipient", () => {
    const rule = createRoyaltyRule("GOLD", 250, "creator");
    expect(rule.type).toBe("ROYALTY");
    expect(rule.params["basisPoints"]).toBe(250);
    expect(rule.params["recipient"]).toBe("creator");
  });

  it("createXpThresholdRule sets minXp", () => {
    const rule = createXpThresholdRule("GOLD", 500);
    expect(rule.type).toBe("XP_THRESHOLD");
    expect(rule.params["minXp"]).toBe(500);
  });

  it("createQuestRewardRule sets questId and amount", () => {
    const rule = createQuestRewardRule("q-1", "GOLD", 100n);
    expect(rule.type).toBe("QUEST_REWARD");
    expect(rule.params["questId"]).toBe("q-1");
    expect(rule.params["amount"]).toBe(100n);
  });
});
