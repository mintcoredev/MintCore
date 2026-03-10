import { describe, it, expect, beforeEach } from "vitest";
import { EventStore } from "../ledger/eventStore.js";
import { Ledger } from "../ledger/ledger.js";
import { serializeEvent, deserializeEvent, hashEvent } from "../ledger/serializers.js";
import { EVENT_TYPES } from "../ledger/eventTypes.js";
import type { Event } from "../models/event.js";

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "test-id-1",
  type: "MINT",
  asset: "GOLD",
  to: "alice",
  amount: 100n,
  timestamp: 1000,
  ...overrides,
});

describe("EventStore", () => {
  it("appends and retrieves events", () => {
    const store = new EventStore();
    const event = makeEvent();
    store.append(event);
    expect(store.getAll()).toHaveLength(1);
    expect(store.getAll()[0]).toEqual(event);
  });

  it("returns a copy from getAll so internal state is not mutated", () => {
    const store = new EventStore();
    store.append(makeEvent());
    const all = store.getAll();
    all.pop();
    expect(store.getAll()).toHaveLength(1);
  });

  it("filters by asset", () => {
    const store = new EventStore();
    store.append(makeEvent({ asset: "GOLD" }));
    store.append(makeEvent({ id: "2", asset: "SILVER" }));
    expect(store.query({ asset: "GOLD" })).toHaveLength(1);
  });

  it("filters by address (to)", () => {
    const store = new EventStore();
    store.append(makeEvent({ to: "alice" }));
    store.append(makeEvent({ id: "2", to: "bob" }));
    expect(store.query({ address: "alice" })).toHaveLength(1);
  });

  it("filters by address (from)", () => {
    const store = new EventStore();
    store.append(makeEvent({ from: "alice", to: "charlie", type: "TRANSFER" }));
    store.append(makeEvent({ id: "2", from: "bob", to: "charlie", type: "TRANSFER" }));
    expect(store.query({ address: "alice" })).toHaveLength(1);
  });

  it("filters by type", () => {
    const store = new EventStore();
    store.append(makeEvent({ type: "MINT" }));
    store.append(makeEvent({ id: "2", type: "BURN" }));
    expect(store.query({ type: "MINT" })).toHaveLength(1);
  });

  it("filters by timestamp range", () => {
    const store = new EventStore();
    store.append(makeEvent({ id: "1", timestamp: 100 }));
    store.append(makeEvent({ id: "2", timestamp: 200 }));
    store.append(makeEvent({ id: "3", timestamp: 300 }));
    expect(store.query({ fromTimestamp: 150, toTimestamp: 250 })).toHaveLength(1);
  });

  it("clears all events", () => {
    const store = new EventStore();
    store.append(makeEvent());
    store.clear();
    expect(store.getAll()).toHaveLength(0);
  });
});

describe("Ledger", () => {
  let ledger: Ledger;

  beforeEach(() => {
    ledger = new Ledger();
  });

  it("appendEvent stores the event", () => {
    ledger.appendEvent(makeEvent());
    expect(ledger.getEvents()).toHaveLength(1);
  });

  it("getEvents returns all events when no filter", () => {
    ledger.appendEvent(makeEvent({ id: "1" }));
    ledger.appendEvent(makeEvent({ id: "2" }));
    expect(ledger.getEvents()).toHaveLength(2);
  });

  it("getEvents filters by asset", () => {
    ledger.appendEvent(makeEvent({ id: "1", asset: "GOLD" }));
    ledger.appendEvent(makeEvent({ id: "2", asset: "SILVER" }));
    expect(ledger.getEvents({ asset: "GOLD" })).toHaveLength(1);
  });

  it("replay returns all events in order", () => {
    ledger.appendEvent(makeEvent({ id: "1", timestamp: 1 }));
    ledger.appendEvent(makeEvent({ id: "2", timestamp: 2 }));
    const replayed = ledger.replay();
    expect(replayed).toHaveLength(2);
    expect(replayed[0]!.id).toBe("1");
    expect(replayed[1]!.id).toBe("2");
  });

  it("accepts a custom EventStore", () => {
    const store = new EventStore();
    const customLedger = new Ledger(store);
    customLedger.appendEvent(makeEvent());
    expect(store.getAll()).toHaveLength(1);
  });
});

describe("serializers", () => {
  it("serializeEvent round-trips via deserializeEvent", () => {
    const event = makeEvent({ amount: 999999999999999999n });
    const json = serializeEvent(event);
    const restored = deserializeEvent(json);
    expect(restored).toEqual(event);
  });

  it("serializes bigint amount as string", () => {
    const json = serializeEvent(makeEvent({ amount: 42n }));
    expect(JSON.parse(json).amount).toBe("42");
  });

  it("hashEvent returns a hex string", () => {
    const hash = hashEvent(makeEvent());
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("hashEvent is deterministic for the same event", () => {
    const event = makeEvent();
    expect(hashEvent(event)).toBe(hashEvent(event));
  });

  it("hashEvent differs for different events", () => {
    const e1 = makeEvent({ amount: 1n });
    const e2 = makeEvent({ amount: 2n });
    expect(hashEvent(e1)).not.toBe(hashEvent(e2));
  });
});

describe("EVENT_TYPES", () => {
  it("contains all required event types", () => {
    expect(EVENT_TYPES.MINT).toBe("MINT");
    expect(EVENT_TYPES.TRANSFER).toBe("TRANSFER");
    expect(EVENT_TYPES.BURN).toBe("BURN");
    expect(EVENT_TYPES.REWARD).toBe("REWARD");
    expect(EVENT_TYPES.FEE).toBe("FEE");
    expect(EVENT_TYPES.ADJUSTMENT).toBe("ADJUSTMENT");
  });
});
