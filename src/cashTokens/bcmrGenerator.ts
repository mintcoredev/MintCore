import { sha256 } from "@bitauth/libauth";
import type { BcmrDocument, BcmrGeneratorOptions, BcmrIdentitySnapshot } from "../types/BcmrTypes.js";
import { toHex } from "../utils/hex.js";
import { MintCoreError } from "../utils/errors.js";

/** Canonical URL for the BCMR v2 JSON schema. */
const BCMR_SCHEMA_URL = "https://cashtokens.org/bcmr-v2.schema.json";

/**
 * Generate a BCMR v2 document for a CashTokens identity.
 *
 * The returned document is ready to be serialised with `JSON.stringify` and
 * hosted at the URI embedded in the token's BCMR OP_RETURN output.  Pass the
 * serialised document to {@link hashBcmr} to obtain the content hash required
 * for hash-pinned authchain registrations.
 *
 * @example
 * ```ts
 * const doc = generateBcmr({
 *   category: "abcd...0001",
 *   name: "My Token",
 *   symbol: "MTK",
 *   decimals: 8,
 *   uris: { icon: "ipfs://bafybei..." },
 * });
 * const hash = hashBcmr(doc);
 * ```
 */
export function generateBcmr(options: BcmrGeneratorOptions): BcmrDocument {
  const { category, name, symbol, decimals, description, uris, tags } = options;

  if (!category || !/^[0-9a-fA-F]{64}$/.test(category)) {
    throw new MintCoreError(
      "BCMR category must be a valid 64-character hex string (32-byte token category)"
    );
  }
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new MintCoreError("BCMR name is required and must be a non-empty string");
  }

  // Validate decimals
  if (decimals !== undefined && (decimals < 0 || decimals > 18)) {
    throw new MintCoreError("decimals must be between 0 and 18");
  }

  // Validate symbol
  if (symbol !== undefined && (typeof symbol !== "string" || !symbol)) {
    throw new MintCoreError("symbol must be a non-empty string");
  }

  // Validate timestamp
  if (options.timestamp !== undefined) {
    const parsed = Date.parse(options.timestamp);
    if (isNaN(parsed)) {
      throw new MintCoreError("timestamp must be a valid ISO 8601 string");
    }
    const maxFutureMs = 24 * 60 * 60 * 1000; // 24 hours
    if (parsed > Date.now() + maxFutureMs) {
      throw new MintCoreError(
        "timestamp must not be more than 24 hours in the future"
      );
    }
  }

  // Validate URIs
  if (uris !== undefined) {
    if (typeof uris !== "object" || Array.isArray(uris)) {
      throw new MintCoreError("uris must be an object of string values");
    }
    for (const [k, v] of Object.entries(uris)) {
      if (typeof v !== "string") {
        throw new MintCoreError(`uri '${k}' must be a string`);
      }
    }
  }

  // Validate tags
  if (tags !== undefined) {
    if (!Array.isArray(tags) || !tags.every(t => typeof t === "string")) {
      throw new MintCoreError("tags must be an array of strings");
    }
  }

  const timestamp = options.timestamp ?? new Date().toISOString();

  const tokenRecord: BcmrDocument["identities"][string][string]["token"] = { category };
  if (decimals !== undefined) tokenRecord.decimals = decimals;
  if (symbol !== undefined) tokenRecord.symbol = symbol;

  const snapshot: BcmrIdentitySnapshot = { name };
  if (description !== undefined) snapshot.description = description;
  snapshot.token = tokenRecord;
  if (uris !== undefined && Object.keys(uris).length > 0) snapshot.uris = uris;
  if (tags !== undefined && tags.length > 0) snapshot.tags = tags;

  return {
    $schema: BCMR_SCHEMA_URL,
    version: { major: 0, minor: 1, patch: 0 },
    latestRevision: timestamp,
    registryIdentity: {},
    identities: {
      [category]: {
        [timestamp]: snapshot,
      },
    },
  };
}

/**
 * Recursively canonicalize a value to a JSON string with sorted object keys.
 * This ensures a stable, deterministic representation regardless of insertion order.
 * Properties with `undefined` values are omitted, matching JSON.stringify behavior.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + (value as unknown[]).map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}

/**
 * Compute the SHA-256 content hash of a BCMR document.
 *
 * The hash is derived from the canonical JSON serialisation of the document
 * (object keys sorted recursively, UTF-8 encoded) and returned as a lowercase
 * 64-character hex string.  Use this value as the `bcmrHash` in
 * {@link TokenSchema} to create a hash-pinned authchain registration.
 *
 * @param document - A BCMR document, typically produced by {@link generateBcmr}.
 * @returns A 64-character lowercase hex string (32-byte SHA-256 digest).
 */
export function hashBcmr(document: BcmrDocument): string {
  const canonical = canonicalize(document);
  const bytes = new TextEncoder().encode(canonical);
  return toHex(sha256.hash(bytes));
}
