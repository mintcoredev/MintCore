import { randomUUID } from "node:crypto";
import type { Event } from "../models/event.js";
import type { Ledger } from "../ledger/ledger.js";
import type { BalanceEngine } from "../balances/balanceEngine.js";
import type { SupplyEngine } from "../balances/supplyEngine.js";
import type { RuleEngine } from "../rules/ruleEngine.js";

export interface BurnParams {
  asset: string;
  from: string;
  amount: bigint;
  metadata?: Record<string, unknown>;
}

export class BurnService {
  constructor(
    private readonly ledger: Ledger,
    private readonly balanceEngine: BalanceEngine,
    private readonly supplyEngine: SupplyEngine,
    private readonly ruleEngine: RuleEngine,
  ) {}

  burn(params: BurnParams): Event {
    const currentBalance = this.balanceEngine.getBalance(
      params.from,
      params.asset,
    );
    const event: Event = {
      id: randomUUID(),
      type: "BURN",
      asset: params.asset,
      from: params.from,
      amount: params.amount,
      timestamp: Date.now(),
      metadata: params.metadata,
    };
    this.ruleEngine.validate(event, { currentBalance });
    this.ledger.appendEvent(event);
    this.balanceEngine.applyEvent(event);
    this.supplyEngine.applyEvent(event);
    return event;
  }
}
