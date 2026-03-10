import { randomUUID } from "node:crypto";
import type { Event } from "../models/event.js";
import type { Ledger } from "../ledger/ledger.js";
import type { BalanceEngine } from "../balances/balanceEngine.js";
import { ValidationError } from "../models/errors.js";

export interface FeeParams {
  asset: string;
  from: string;
  amount: bigint;
  collector?: string;
  metadata?: Record<string, unknown>;
}

export class FeeService {
  constructor(
    private readonly ledger: Ledger,
    private readonly balanceEngine: BalanceEngine,
  ) {}

  collectFee(params: FeeParams): Event {
    const currentBalance = this.balanceEngine.getBalance(
      params.from,
      params.asset,
    );
    if (currentBalance < params.amount) {
      throw new ValidationError(
        `Insufficient balance for fee: has ${currentBalance}, needs ${params.amount}`,
      );
    }
    const event: Event = {
      id: randomUUID(),
      type: "FEE",
      asset: params.asset,
      from: params.from,
      to: params.collector,
      amount: params.amount,
      timestamp: Date.now(),
      metadata: params.metadata,
    };
    this.ledger.appendEvent(event);
    this.balanceEngine.applyEvent(event);
    return event;
  }
}
