import { AccountingError, ValidationError } from "../models/errors.js";

export type AdjustmentDirection = "credit" | "debit";

export interface AdjustmentParams {
  asset: string;
  address: string;
  amount: bigint;
  direction: AdjustmentDirection;
  metadata?: Record<string, unknown>;
}

export class AdjustmentService {
  private balances = new Map<string, Map<string, bigint>>();

  adjust(params: AdjustmentParams): void {
    const { asset, address, amount, direction } = params;
    if (typeof amount !== "bigint" || amount <= 0n) {
      throw new ValidationError("Amount must be a positive BigInt");
    }
    const addressBalances =
      this.balances.get(address) ?? new Map<string, bigint>();
    const current = addressBalances.get(asset) ?? 0n;
    const next = direction === "credit" ? current + amount : current - amount;
    if (next < 0n) {
      throw new AccountingError(
        `Insufficient balance: cannot debit ${amount} from ${current}`
      );
    }
    addressBalances.set(asset, next);
    this.balances.set(address, addressBalances);
  }

  getBalance(address: string, asset: string): bigint {
    return this.balances.get(address)?.get(asset) ?? 0n;
  }
}
