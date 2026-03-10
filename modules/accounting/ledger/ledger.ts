import type { Event } from "../models/event.js";
import type { EventFilter } from "./eventStore.js";
import { EventStore } from "./eventStore.js";

export class Ledger {
  private store: EventStore;

  constructor(store?: EventStore) {
    this.store = store ?? new EventStore();
  }

  appendEvent(event: Event): void {
    this.store.append(event);
  }

  getEvents(filter?: EventFilter): Event[] {
    return this.store.query(filter);
  }

  replay(): Event[] {
    return this.store.getAll();
  }
}
