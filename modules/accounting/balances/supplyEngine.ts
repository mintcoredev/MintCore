import type { Event } from "../models/event.js";

export class SupplyEngine {
  private minted = new Map<string, bigint>();
  private burned = new Map<string, bigint>();

  getSupply(asset: string): bigint {
    return (this.minted.get(asset) ?? 0n) - (this.burned.get(asset) ?? 0n);
  }

  getMinted(asset: string): bigint {
    return this.minted.get(asset) ?? 0n;
  }

  getBurned(asset: string): bigint {
    return this.burned.get(asset) ?? 0n;
  }

  applyEvent(event: Event): void {
    if (event.type === "MINT" || event.type === "REWARD") {
      this.minted.set(event.asset, (this.minted.get(event.asset) ?? 0n) + event.amount);
    } else if (event.type === "BURN") {
      this.burned.set(event.asset, (this.burned.get(event.asset) ?? 0n) + event.amount);
    }
  }
}
