import { randomUUID } from "node:crypto";
import type { Event } from "../models/event.js";
import type { Ledger } from "../ledger/ledger.js";
import type { BalanceEngine } from "../balances/balanceEngine.js";
import type { SupplyEngine } from "../balances/supplyEngine.js";
import { ValidationError } from "../models/errors.js";

export type AdjustmentDirection = "credit" | "debit";

export interface AdjustmentParams {
  asset: string;
  address: string;
  amount: bigint;
  direction: AdjustmentDirection;
  metadata?: Record<string, unknown>;
}

export class AdjustmentService {
  constructor(
    private readonly ledger: Ledger,
    private readonly balanceEngine: BalanceEngine,
    private readonly supplyEngine: SupplyEngine,
  ) {}

  adjust(params: AdjustmentParams): Event {
    if (params.direction === "debit") {
      const currentBalance = this.balanceEngine.getBalance(
        params.address,
        params.asset,
      );
      if (currentBalance < params.amount) {
        throw new ValidationError(
          `Insufficient balance for debit adjustment: has ${currentBalance}, needs ${params.amount}`,
        );
      }
    }
    const event: Event = {
      id: randomUUID(),
      type: "ADJUSTMENT",
      asset: params.asset,
      from: params.direction === "debit" ? params.address : undefined,
      to: params.direction === "credit" ? params.address : undefined,
      amount: params.amount,
      timestamp: Date.now(),
      metadata: { ...params.metadata, direction: params.direction },
    };
    this.ledger.appendEvent(event);
    this.balanceEngine.applyEvent(event);
    this.supplyEngine.applyEvent(event);
    return event;
  }
}
