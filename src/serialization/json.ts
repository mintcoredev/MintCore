/**
 * JSON serialization helpers for MintCore Phase Two.
 *
 * Pure, deterministic serialization and deserialization for pack and item
 * definitions.  All functions are side-effect free and dependency-light.
 */

import { MintCoreError } from '../utils/errors.js';
import { type PackDefinition, assertPackDefinition } from '../packs/pack.js';
import { type ItemDefinition, assertItemDefinition } from '../items/item.js';

// ── Pack serialization ─────────────────────────────────────────────────────

/**
 * Serialize a {@link PackDefinition} to a JSON string.
 *
 * @throws {MintCoreError} when `pack` is not a valid {@link PackDefinition}.
 *
 * @example
 * ```ts
 * const json = serializePack(pack);
 * ```
 */
export function serializePack(pack: PackDefinition): string {
  assertPackDefinition(pack);
  return JSON.stringify(pack);
}

/**
 * Deserialize a JSON string into a {@link PackDefinition}.
 *
 * @throws {MintCoreError} when `json` is not valid JSON or does not conform
 *   to the {@link PackDefinition} structure.
 *
 * @example
 * ```ts
 * const pack = deserializePack(json);
 * ```
 */
export function deserializePack(json: string): PackDefinition {
  if (typeof json !== 'string') {
    throw new MintCoreError('deserializePack: input must be a string');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new MintCoreError('deserializePack: input is not valid JSON');
  }
  assertPackDefinition(parsed);
  return parsed;
}

// ── Item serialization ─────────────────────────────────────────────────────

/**
 * Serialize an {@link ItemDefinition} to a JSON string.
 *
 * @throws {MintCoreError} when `item` is not a valid {@link ItemDefinition}.
 *
 * @example
 * ```ts
 * const json = serializeItem(item);
 * ```
 */
export function serializeItem(item: ItemDefinition): string {
  assertItemDefinition(item);
  return JSON.stringify(item);
}

/**
 * Deserialize a JSON string into an {@link ItemDefinition}.
 *
 * @throws {MintCoreError} when `json` is not valid JSON or does not conform
 *   to the {@link ItemDefinition} structure.
 *
 * @example
 * ```ts
 * const item = deserializeItem(json);
 * ```
 */
export function deserializeItem(json: string): ItemDefinition {
  if (typeof json !== 'string') {
    throw new MintCoreError('deserializeItem: input must be a string');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new MintCoreError('deserializeItem: input is not valid JSON');
  }
  assertItemDefinition(parsed);
  return parsed;
}
