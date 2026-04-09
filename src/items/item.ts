/**
 * Item interfaces for MintCore Phase Two.
 *
 * Defines the data structures for describing individual items within a pack.
 * This module is data-only — no RNG, no selection logic, no game mechanics.
 */

import { MintCoreError } from '../utils/errors.js';
import { isRarity, Rarity } from '../rarity/rarity.js';

// ── Scalar types ───────────────────────────────────────────────────────────

/**
 * A string that uniquely identifies an item definition within a system.
 * No format is enforced; consumers may use UUIDs, slugs, or any stable key.
 */
export type ItemId = string;

// ── Interfaces ─────────────────────────────────────────────────────────────

/**
 * Display and descriptive metadata for an item.
 */
export interface ItemMetadata {
  /** Human-readable item name (non-empty). */
  name: string;
  /** Optional short description of the item. */
  description?: string;
  /** Optional URI pointing to an image or icon for the item. */
  image?: string;
  /** Arbitrary key-value attributes for extensibility. */
  attributes?: Record<string, unknown>;
}

/**
 * A complete, versioned definition of an item.
 *
 * `ItemDefinition` is pure data — it describes what an item *is*, not how it
 * behaves.  All functional logic (minting, rarity selection, etc.) belongs in
 * application-layer modules.
 */
export interface ItemDefinition {
  /** Stable identifier for this item definition. */
  id: ItemId;
  /** Display and descriptive metadata. */
  metadata: ItemMetadata;
  /** Descriptive rarity tier.  Carries no probability or weighting semantics. */
  rarity: Rarity;
  /** Schema version.  Must be a positive integer. */
  version: number;
}

// ── Type guards ────────────────────────────────────────────────────────────

/**
 * Returns `true` when `value` is a structurally valid {@link ItemMetadata}.
 */
export function isItemMetadata(value: unknown): value is ItemMetadata {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  if (typeof m.name !== 'string' || m.name.trim().length === 0) return false;
  if (m.description !== undefined && typeof m.description !== 'string') return false;
  if (m.image !== undefined && typeof m.image !== 'string') return false;
  if (m.attributes !== undefined) {
    if (
      typeof m.attributes !== 'object' ||
      m.attributes === null ||
      Array.isArray(m.attributes)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Returns `true` when `value` is a structurally valid {@link ItemDefinition}.
 */
export function isItemDefinition(value: unknown): value is ItemDefinition {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  if (typeof d.id !== 'string' || d.id.trim().length === 0) return false;
  if (!isItemMetadata(d.metadata)) return false;
  if (!isRarity(d.rarity)) return false;
  if (typeof d.version !== 'number' || !Number.isInteger(d.version) || d.version < 1) {
    return false;
  }
  return true;
}

// ── Assertion helpers ──────────────────────────────────────────────────────

/**
 * Assert that `value` is a well-formed {@link ItemDefinition}.
 *
 * @throws {MintCoreError} on the first constraint violation.
 */
export function assertItemDefinition(value: unknown): asserts value is ItemDefinition {
  if (!value || typeof value !== 'object') {
    throw new MintCoreError('ItemDefinition must be a non-null object');
  }
  const d = value as Record<string, unknown>;

  if (typeof d.id !== 'string' || d.id.trim().length === 0) {
    throw new MintCoreError('ItemDefinition.id must be a non-empty string');
  }
  if (!isItemMetadata(d.metadata)) {
    throw new MintCoreError('ItemDefinition.metadata must be a valid ItemMetadata object');
  }
  if (!isRarity(d.rarity)) {
    throw new MintCoreError(`ItemDefinition.rarity must be a valid Rarity value, got ${d.rarity}`);
  }
  if (typeof d.version !== 'number' || !Number.isInteger(d.version) || d.version < 1) {
    throw new MintCoreError(
      `ItemDefinition.version must be a positive integer, got ${d.version}`
    );
  }
}
