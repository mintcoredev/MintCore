import type { Rule } from "../models/rule.js";

export function createMaxSupplyRule(asset: string, maxSupply: bigint): Rule {
  return { type: "maxSupply", asset, params: { maxSupply } };
}

export function createMintAuthorityRule(
  asset: string,
  authorities: string[]
): Rule {
  return { type: "mintAuthority", asset, params: { authorities } };
}

export function createSoulboundRule(asset: string): Rule {
  return { type: "soulbound", asset, params: {} };
}

export function createCooldownRule(
  asset: string,
  cooldownMs: number
): Rule {
  if (!Number.isFinite(cooldownMs) || cooldownMs < 0) {
    throw new Error("cooldownMs must be a non-negative number");
  }
  return { type: "cooldown", asset, params: { cooldownMs } };
}

export function createRoyaltyRule(
  asset: string,
  basisPoints: number,
  recipient: string
): Rule {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new Error("basisPoints must be an integer between 0 and 10000");
  }
  return { type: "royalty", asset, params: { basisPoints, recipient } };
}

export function createXpThresholdRule(
  asset: string,
  minXp: bigint
): Rule {
  return { type: "xpThreshold", asset, params: { minXp } };
}

export function createQuestRewardRule(
  asset: string,
  questId: string,
  rewardAmount: bigint
): Rule {
  return { type: "questReward", asset, params: { questId, rewardAmount } };
}
