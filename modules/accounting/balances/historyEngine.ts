import type { Event } from "../models/event.js";

export class HistoryEngine {
  private history = new Map<string, Event[]>();

  getHistory(address: string): Event[] {
    return [...(this.history.get(address) ?? [])];
  }

  applyEvent(event: Event): void {
    if (event.to) {
      if (!this.history.has(event.to)) this.history.set(event.to, []);
      this.history.get(event.to)!.push(event);
    }
    if (event.from) {
      if (!this.history.has(event.from)) this.history.set(event.from, []);
      this.history.get(event.from)!.push(event);
    }
  }
}
