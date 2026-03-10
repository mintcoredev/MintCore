import { createHash } from "node:crypto";
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
  return createHash("sha256").update(serialized).digest("hex");
}
