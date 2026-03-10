import { randomUUID } from "node:crypto";
import type { Event } from "../models/event.js";
import type { Ledger } from "../ledger/ledger.js";
import type { BalanceEngine } from "../balances/balanceEngine.js";
import type { SupplyEngine } from "../balances/supplyEngine.js";
import type { RuleEngine } from "../rules/ruleEngine.js";

export interface RewardParams {
  ruleId: string;
  asset: string;
  to: string;
  amount: bigint;
  metadata?: Record<string, unknown>;
}

export class RewardService {
  constructor(
    private readonly ledger: Ledger,
    private readonly balanceEngine: BalanceEngine,
    private readonly supplyEngine: SupplyEngine,
    private readonly ruleEngine: RuleEngine,
  ) {}

  reward(params: RewardParams): Event {
    const event: Event = {
      id: randomUUID(),
      type: "REWARD",
      asset: params.asset,
      to: params.to,
      amount: params.amount,
      timestamp: Date.now(),
      metadata: { ...params.metadata, ruleId: params.ruleId },
    };
    this.ruleEngine.validate(event);
    this.ledger.appendEvent(event);
    this.balanceEngine.applyEvent(event);
    this.supplyEngine.applyEvent(event);
    return event;
  }
}
