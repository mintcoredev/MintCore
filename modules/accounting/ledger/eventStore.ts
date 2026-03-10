import type { Event } from "../models/event.js";

export interface EventFilter {
  asset?: string;
  address?: string;
  type?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
}

export class EventStore {
  private events: Event[] = [];

  append(event: Event): void {
    this.events.push(event);
  }

  query(filter?: EventFilter): Event[] {
    let result = [...this.events];
    if (filter?.asset) result = result.filter((e) => e.asset === filter.asset);
    if (filter?.address)
      result = result.filter(
        (e) => e.from === filter.address || e.to === filter.address,
      );
    if (filter?.type) result = result.filter((e) => e.type === filter.type);
    if (filter?.fromTimestamp !== undefined)
      result = result.filter((e) => e.timestamp >= filter.fromTimestamp!);
    if (filter?.toTimestamp !== undefined)
      result = result.filter((e) => e.timestamp <= filter.toTimestamp!);
    return result;
  }

  getAll(): Event[] {
    return [...this.events];
  }

  clear(): void {
    this.events = [];
  }
}
