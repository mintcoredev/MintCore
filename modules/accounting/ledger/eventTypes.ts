import type { EventType } from "../models/event.js";

export const EVENT_TYPES: Readonly<Record<EventType, EventType>> = {
  MINT: "MINT",
  TRANSFER: "TRANSFER",
  BURN: "BURN",
  REWARD: "REWARD",
  FEE: "FEE",
  ADJUSTMENT: "ADJUSTMENT",
} as const;
