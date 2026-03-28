export type RuleType =
  | "maxSupply"
  | "mintAuthority"
  | "soulbound"
  | "cooldown"
  | "royalty"
  | "xpThreshold"
  | "questReward";

export interface Rule {
  type: RuleType;
  asset: string;
  params: Record<string, unknown>;
}
