import type { Event } from "../models/event.js";

export class OwnershipEngine {
  private ownership = new Map<string, Set<string>>();

  getHolders(asset: string): string[] {
    return Array.from(this.ownership.get(asset) ?? []);
  }

  applyEvent(event: Event): void {
    if (event.to && event.amount > 0n) {
      if (!this.ownership.has(event.asset)) {
        this.ownership.set(event.asset, new Set());
      }
      this.ownership.get(event.asset)!.add(event.to);
    }
  }
}
