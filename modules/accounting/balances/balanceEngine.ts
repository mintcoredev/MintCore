import type { Event } from "../models/event.js";
import type { Balance } from "../models/balance.js";

export class BalanceEngine {
  private balances = new Map<string, bigint>();

  private key(address: string, asset: string): string {
    return `${address}\x00${asset}`;
  }

  getBalance(address: string, asset: string): bigint {
    return this.balances.get(this.key(address, asset)) ?? 0n;
  }

  applyEvent(event: Event): void {
    if (event.to) {
      const toKey = this.key(event.to, event.asset);
      this.balances.set(toKey, (this.balances.get(toKey) ?? 0n) + event.amount);
    }
    if (
      event.from &&
      (event.type === "TRANSFER" ||
        event.type === "BURN" ||
        event.type === "FEE")
    ) {
      const fromKey = this.key(event.from, event.asset);
      this.balances.set(fromKey, (this.balances.get(fromKey) ?? 0n) - event.amount);
    }
  }

  getAllBalances(): Balance[] {
    const result: Balance[] = [];
    for (const [key, amount] of this.balances) {
      const separatorIndex = key.indexOf("\x00");
      const address = key.slice(0, separatorIndex);
      const asset = key.slice(separatorIndex + 1);
      result.push({ address, asset, amount });
    }
    return result;
  }
}
