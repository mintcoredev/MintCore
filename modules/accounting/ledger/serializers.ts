import type { Event } from "../models/event.js";

export function serializeEvent(event: Event): string {
  return JSON.stringify({ ...event, amount: event.amount.toString() });
}

export function deserializeEvent(json: string): Event {
  const obj = JSON.parse(json) as Record<string, unknown>;
  return { ...(obj as Omit<Event, "amount">), amount: BigInt(obj["amount"] as string) };
}

export function hashEvent(event: Event): string {
  const serialized = serializeEvent(event);
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    const char = serialized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}
