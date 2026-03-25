/**
 * MintCore Unified API
 *
 * Public surface for v0.3.0. Import from "mintcore" to access all public
 * exports — minting, metadata, accounting, and rules.
 *
 * @example
 * import { mintFungibleToken, AccountingAPI, createMaxSupplyRule } from "mintcore";
 */

// ── minting + utilities (full src entry point) ───────────────────────────────
export * from "../src/index.js";

// ── accounting ───────────────────────────────────────────────────────────────
export { AccountingAPI } from "../modules/accounting/api/accountingAPI.js";
export type { Event, EventType } from "../modules/accounting/models/event.js";
export type { Asset } from "../modules/accounting/models/asset.js";
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

// ── adjustment ────────────────────────────────────────────────────────────────
export { AdjustmentService } from "../modules/accounting/services/adjustmentService.js";
export type { AdjustmentParams, AdjustmentDirection } from "../modules/accounting/services/adjustmentService.js";
