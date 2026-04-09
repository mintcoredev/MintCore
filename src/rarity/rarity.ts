/**
 * Rarity model for MintCore Phase Two.
 *
 * Provides a descriptive rarity enum and pure helper functions.
 * This module is data-only — no randomness, no weighting, no selection logic.
 */

import { MintCoreError } from '../utils/errors.js';

// ── Rarity enum ────────────────────────────────────────────────────────────

/**
 * Descriptive rarity tiers for items.
 *
 * The values are numeric so they can be stored, serialised, and compared
 * without extra mapping.  They carry no probability or weighting semantics.
 */
export enum Rarity {
  Common = 0,
  Uncommon = 1,
  Rare = 2,
  Epic = 3,
  Legendary = 4,
}

// ── Helper functions ───────────────────────────────────────────────────────

/** The set of valid numeric {@link Rarity} values. */
const VALID_RARITIES = new Set<number>([
  Rarity.Common,
  Rarity.Uncommon,
  Rarity.Rare,
  Rarity.Epic,
  Rarity.Legendary,
]);

/**
 * Type guard — returns `true` when `value` is a valid {@link Rarity} member.
 *
 * @example
 * ```ts
 * if (isRarity(someNumber)) {
 *   // someNumber is narrowed to Rarity
 * }
 * ```
 */
export function isRarity(value: unknown): value is Rarity {
  return typeof value === 'number' && VALID_RARITIES.has(value);
}

/**
 * Returns the human-readable name of a {@link Rarity} value.
 *
 * @throws {MintCoreError} when `r` is not a valid {@link Rarity} member.
 *
 * @example
 * ```ts
 * rarityToString(Rarity.Epic); // "Epic"
 * ```
 */
export function rarityToString(r: Rarity): string {
  switch (r) {
    case Rarity.Common:    return 'Common';
    case Rarity.Uncommon:  return 'Uncommon';
    case Rarity.Rare:      return 'Rare';
    case Rarity.Epic:      return 'Epic';
    case Rarity.Legendary: return 'Legendary';
    default:
      throw new MintCoreError(`Unknown Rarity value: ${r as number}`);
  }
}
