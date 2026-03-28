export type EventType = "mint" | "transfer" | "burn" | "adjustment";

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
