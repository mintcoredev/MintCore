import { randomUUID } from "node:crypto";
import type { Event } from "../models/event.js";
import type { Ledger } from "../ledger/ledger.js";
import type { BalanceEngine } from "../balances/balanceEngine.js";
import type { SupplyEngine } from "../balances/supplyEngine.js";
import type { RuleEngine } from "../rules/ruleEngine.js";

export interface MintParams {
  asset: string;
  to: string;
  amount: bigint;
  from?: string;
  metadata?: Record<string, unknown>;
}

export class MintService {
  constructor(
    private readonly ledger: Ledger,
    private readonly balanceEngine: BalanceEngine,
    private readonly supplyEngine: SupplyEngine,
    private readonly ruleEngine: RuleEngine,
  ) {}

  mint(params: MintParams): Event {
    const event: Event = {
      id: randomUUID(),
      type: "MINT",
      asset: params.asset,
      from: params.from,
      to: params.to,
      amount: params.amount,
      timestamp: Date.now(),
      metadata: params.metadata,
    };
    this.ruleEngine.validate(event, {
      currentSupply: this.supplyEngine.getSupply(params.asset),
    });
    this.ledger.appendEvent(event);
    this.balanceEngine.applyEvent(event);
    this.supplyEngine.applyEvent(event);
    return event;
  }
}
