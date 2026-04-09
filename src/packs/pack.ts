/**
 * Pack interfaces for MintCore Phase Two.
 *
 * Defines the data structures for describing pack definitions.
 * This module is data-only — no pack-opening logic, no RNG, no rarity weighting.
 */

import { MintCoreError } from '../utils/errors.js';
import { type ItemDefinition, isItemDefinition } from '../items/item.js';

// ── Scalar types ───────────────────────────────────────────────────────────

/**
 * A string that uniquely identifies a pack definition within a system.
 * No format is enforced; consumers may use UUIDs, slugs, or any stable key.
 */
export type PackId = string;

// ── Interfaces ─────────────────────────────────────────────────────────────

/**
 * Display and descriptive metadata for a pack.
 */
export interface PackMetadata {
  /** Human-readable pack name (non-empty). */
  name: string;
  /** Optional short description of the pack. */
  description?: string;
  /** Optional URI pointing to an image or icon for the pack. */
  image?: string;
  /** Arbitrary key-value attributes for extensibility. */
  attributes?: Record<string, unknown>;
}

/**
 * A complete, versioned definition of a pack.
 *
 * `PackDefinition` is pure data — it describes the contents of a pack, not
 * how packs are opened or distributed.  All functional logic (opening, RNG,
 * rarity selection) belongs in application-layer modules.
 */
export interface PackDefinition {
  /** Stable identifier for this pack definition. */
  id: PackId;
  /** Display and descriptive metadata. */
  metadata: PackMetadata;
  /** The item definitions contained in this pack. */
  items: ItemDefinition[];
  /** Schema version.  Must be a positive integer. */
  version: number;
}

// ── Type guards ────────────────────────────────────────────────────────────

/**
 * Returns `true` when `value` is a structurally valid {@link PackMetadata}.
 */
export function isPackMetadata(value: unknown): value is PackMetadata {
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
 * Returns `true` when `value` is a structurally valid {@link PackDefinition}.
 */
export function isPackDefinition(value: unknown): value is PackDefinition {
  if (!value || typeof value !== 'object') return false;
  const d = value as Record<string, unknown>;
  if (typeof d.id !== 'string' || d.id.trim().length === 0) return false;
  if (!isPackMetadata(d.metadata)) return false;
  if (!Array.isArray(d.items)) return false;
  for (const item of d.items as unknown[]) {
    if (!isItemDefinition(item)) return false;
  }
  if (typeof d.version !== 'number' || !Number.isInteger(d.version) || d.version < 1) {
    return false;
  }
  return true;
}

// ── Assertion helpers ──────────────────────────────────────────────────────

/**
 * Assert that `value` is a well-formed {@link PackDefinition}.
 *
 * @throws {MintCoreError} on the first constraint violation.
 */
export function assertPackDefinition(value: unknown): asserts value is PackDefinition {
  if (!value || typeof value !== 'object') {
    throw new MintCoreError('PackDefinition must be a non-null object');
  }
  const d = value as Record<string, unknown>;

  if (typeof d.id !== 'string' || d.id.trim().length === 0) {
    throw new MintCoreError('PackDefinition.id must be a non-empty string');
  }
  if (!isPackMetadata(d.metadata)) {
    throw new MintCoreError('PackDefinition.metadata must be a valid PackMetadata object');
  }
  if (!Array.isArray(d.items)) {
    throw new MintCoreError('PackDefinition.items must be an array');
  }
  for (let i = 0; i < (d.items as unknown[]).length; i++) {
    if (!isItemDefinition((d.items as unknown[])[i])) {
      throw new MintCoreError(
        `PackDefinition.items[${i}] must be a valid ItemDefinition`
      );
    }
  }
  if (typeof d.version !== 'number' || !Number.isInteger(d.version) || d.version < 1) {
    throw new MintCoreError(
      `PackDefinition.version must be a positive integer, got ${d.version}`
    );
  }
}
