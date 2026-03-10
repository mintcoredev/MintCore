/**
 * MintCore Unified API
 *
 * Public surface for v0.1.0. Import from this file instead of reaching
 * into individual modules.
 *
 * @example
 * import { minting, metadata, accounting, rules } from "./api/mintcore.js";
 */

// ── minting ──────────────────────────────────────────────────────────────────
export {
  mintFungibleToken,
  mintNFT,
  verifyMint,
} from "../src/utils/convenience.js";

export { MintEngine } from "../src/core/MintEngine.js";
export type { MintResult } from "../src/core/MintResult.js";

// ── metadata ─────────────────────────────────────────────────────────────────
export {
  createMetadata,
  encodeMetadata,
} from "../src/utils/convenience.js";

// ── accounting ───────────────────────────────────────────────────────────────
export { AccountingAPI } from "../modules/accounting/api/accountingAPI.js";
export type { Event, EventType } from "../modules/accounting/models/event.js";
export type { Balance } from "../modules/accounting/models/balance.js";
export { AccountingError, ValidationError } from "../modules/accounting/models/errors.js";

// ── rules ─────────────────────────────────────────────────────────────────────
export type { Rule, RuleType } from "../modules/accounting/models/rule.js";
export {
  createMaxSupplyRule,
  createMintAuthorityRule,
  createSoulboundRule,
  createCooldownRule,
  createRoyaltyRule,
  createXpThresholdRule,
  createQuestRewardRule,
} from "../modules/accounting/rules/ruleDefinitions.js";
