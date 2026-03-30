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
 * Compute the SHA-256 content hash of a BCMR document.
 *
 * The hash is derived from the JSON serialisation of the document (UTF-8
 * encoded) and is returned as a lowercase 64-character hex string.  Use this
 * value as the `bcmrHash` in {@link TokenSchema} to create a hash-pinned
 * authchain registration.
 *
 * @param document - A BCMR document, typically produced by {@link generateBcmr}.
 * @returns A 64-character lowercase hex string (32-byte SHA-256 digest).
 */
export function hashBcmr(document: BcmrDocument): string {
  const json = JSON.stringify(document);
  const bytes = new TextEncoder().encode(json);
  return toHex(sha256.hash(bytes));
}
