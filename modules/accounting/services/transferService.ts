import { randomUUID } from "node:crypto";
import type { Event } from "../models/event.js";
import type { Ledger } from "../ledger/ledger.js";
import type { BalanceEngine } from "../balances/balanceEngine.js";
import type { RuleEngine } from "../rules/ruleEngine.js";
import { ValidationError } from "../models/errors.js";

export interface TransferParams {
  asset: string;
  from: string;
  to: string;
  amount: bigint;
  metadata?: Record<string, unknown>;
}

export class TransferService {
  constructor(
    private readonly ledger: Ledger,
    private readonly balanceEngine: BalanceEngine,
    private readonly ruleEngine: RuleEngine,
  ) {}

  transfer(params: TransferParams): Event {
    const currentBalance = this.balanceEngine.getBalance(
      params.from,
      params.asset,
    );
    if (currentBalance < params.amount) {
      throw new ValidationError(
        `Insufficient balance: has ${currentBalance}, needs ${params.amount}`,
      );
    }
    const event: Event = {
      id: randomUUID(),
      type: "TRANSFER",
      asset: params.asset,
      from: params.from,
      to: params.to,
      amount: params.amount,
      timestamp: Date.now(),
      metadata: params.metadata,
    };
    this.ruleEngine.validate(event);
    this.ledger.appendEvent(event);
    this.balanceEngine.applyEvent(event);
    return event;
  }
}
