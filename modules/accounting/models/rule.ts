export type RuleType =
  | "MAX_SUPPLY"
  | "MINT_AUTHORITY"
  | "SOULBOUND"
  | "COOLDOWN"
  | "ROYALTY"
  | "XP_THRESHOLD"
  | "QUEST_REWARD";

export interface Rule {
  id: string;
  type: RuleType;
  asset?: string;
  params: Record<string, unknown>;
}
