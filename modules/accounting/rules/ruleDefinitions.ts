import type { Rule } from "../models/rule.js";

export function createMaxSupplyRule(asset: string, maxSupply: bigint): Rule {
  return {
    id: `max-supply-${asset}`,
    type: "MAX_SUPPLY",
    asset,
    params: { maxSupply },
  };
}

export function createMintAuthorityRule(
  asset: string,
  authority: string,
): Rule {
  return {
    id: `mint-authority-${asset}`,
    type: "MINT_AUTHORITY",
    asset,
    params: { authority },
  };
}

export function createSoulboundRule(asset: string): Rule {
  return { id: `soulbound-${asset}`, type: "SOULBOUND", asset, params: {} };
}

export function createCooldownRule(
  asset: string,
  cooldownMs: number,
): Rule {
  return {
    id: `cooldown-${asset}`,
    type: "COOLDOWN",
    asset,
    params: { cooldownMs },
  };
}

export function createRoyaltyRule(
  asset: string,
  basisPoints: number,
  recipient: string,
): Rule {
  return {
    id: `royalty-${asset}`,
    type: "ROYALTY",
    asset,
    params: { basisPoints, recipient },
  };
}

export function createXpThresholdRule(asset: string, minXp: number): Rule {
  return {
    id: `xp-threshold-${asset}`,
    type: "XP_THRESHOLD",
    asset,
    params: { minXp },
  };
}

export function createQuestRewardRule(
  questId: string,
  asset: string,
  amount: bigint,
): Rule {
  return {
    id: `quest-reward-${questId}`,
    type: "QUEST_REWARD",
    asset,
    params: { questId, amount },
  };
}
