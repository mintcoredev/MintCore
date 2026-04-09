/**
 * Metadata Schema v1 for MintCore.
 *
 * A lightweight, versioned metadata structure for CashTokens-based assets.
 * Intentionally minimal — only core fields are required; all extra data
 * belongs in the optional `attributes` map.
 */

import { MintCoreError } from "../utils/errors.js";

// ── Interface ──────────────────────────────────────────────────────────────

/**
 * Base metadata schema (v1).
 *
 * This schema is designed to be extended by higher-level registries
 * (e.g. BCMR documents) without breaking backward compatibility.
 */
export interface MetadataSchema {
  /** Schema version.  Must be a positive integer.  Always `1` for v1 documents. */
  version: number;
  /** Human-readable asset name (non-empty). */
  name: string;
  /** Optional short description of the asset. */
  description?: string;
  /**
   * Arbitrary key-value attributes for extensibility.
   * Keys must be non-empty strings; values may be any JSON-serialisable type.
   */
  attributes?: Record<string, unknown>;
}

// ── Type guard ─────────────────────────────────────────────────────────────

/**
 * Returns `true` when `value` is a structurally valid {@link MetadataSchema}.
 */
export function isMetadataSchema(value: unknown): value is MetadataSchema {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  if (typeof m.version !== "number" || !Number.isInteger(m.version) || m.version < 1) {
    return false;
  }
  if (typeof m.name !== "string" || m.name.trim().length === 0) return false;
  if (m.description !== undefined && typeof m.description !== "string") return false;
  if (m.attributes !== undefined) {
    if (typeof m.attributes !== "object" || m.attributes === null || Array.isArray(m.attributes)) {
      return false;
    }
    for (const key of Object.keys(m.attributes)) {
      if (key.length === 0) return false;
    }
  }
  return true;
}

// ── Validation helper ──────────────────────────────────────────────────────

/**
 * Assert that `value` is a well-formed {@link MetadataSchema}.
 *
 * @throws {MintCoreError} on the first constraint violation.
 */
export function assertMetadataSchema(value: unknown): asserts value is MetadataSchema {
  if (!value || typeof value !== "object") {
    throw new MintCoreError("MetadataSchema must be a non-null object");
  }
  const m = value as Record<string, unknown>;
  if (typeof m.version !== "number" || !Number.isInteger(m.version) || m.version < 1) {
    throw new MintCoreError(
      `MetadataSchema.version must be a positive integer, got ${m.version}`
    );
  }
  if (typeof m.name !== "string" || m.name.trim().length === 0) {
    throw new MintCoreError("MetadataSchema.name must be a non-empty string");
  }
  if (m.description !== undefined && typeof m.description !== "string") {
    throw new MintCoreError(
      `MetadataSchema.description must be a string when provided, got ${typeof m.description}`
    );
  }
  if (m.attributes !== undefined) {
    if (
      typeof m.attributes !== "object" ||
      m.attributes === null ||
      Array.isArray(m.attributes)
    ) {
      throw new MintCoreError("MetadataSchema.attributes must be a plain object when provided");
    }
    for (const key of Object.keys(m.attributes)) {
      if (key.length === 0) {
        throw new MintCoreError("MetadataSchema.attributes keys must be non-empty strings");
      }
    }
  }
}
