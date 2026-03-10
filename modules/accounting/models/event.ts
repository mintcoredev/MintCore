export type EventType =
  | "MINT"
  | "TRANSFER"
  | "BURN"
  | "REWARD"
  | "FEE"
  | "ADJUSTMENT";

export interface Event {
  id: string;
  type: EventType;
  asset: string;
  from?: string;
  to?: string;
  amount: bigint;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
