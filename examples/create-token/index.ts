/**
 * create-token example
 *
 * Demonstrates:
 *   - Creating a TokenId
 *   - Creating a TokenUtxo
 *   - Using metadata schema v1
 *
 * No blockchain RPC calls. No minting. Pure TypeScript data construction.
 */

import {
  toTokenId,
  toTokenCategory,
  toTokenAmount,
  isTokenId,
  isTokenUtxo,
  assertTokenUtxo,
  assertMetadataSchema,
} from "mintcore";
import type {
  TokenId,
  TokenCategory,
  TokenAmount,
  TokenUtxo,
  MetadataSchema,
} from "mintcore";

// ── 1. Create a TokenId ────────────────────────────────────────────────────

// A TokenId is a 64-character lowercase hex string (genesis txid in internal
// byte order). toTokenId validates the format and returns a branded type.
const rawTxid = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
const tokenId: TokenId = toTokenId(rawTxid);

console.log("TokenId:", tokenId);
console.log("isTokenId:", isTokenId(tokenId)); // true

// ── 2. Create related scalar types ────────────────────────────────────────

const category: TokenCategory = toTokenCategory(rawTxid);
const amount: TokenAmount = toTokenAmount(1_000_000n);

console.log("TokenCategory:", category);
console.log("TokenAmount:", amount);

// ── 3. Create a TokenUtxo ─────────────────────────────────────────────────

// A TokenUtxo is a BaseUtxo extended with a `token` field that carries
// CashTokens data (fungible tokens, an NFT, or both).
const tokenUtxo: TokenUtxo = {
  txid: rawTxid,
  vout: 0,
  satoshis: 10_000,
  lockingScript: "76a914" + "aa".repeat(20) + "88ac",
  token: {
    category,
    amount,
    nft: {
      capability: "none",
      commitment: "deadbeef",
    },
  },
};

console.log("\nTokenUtxo:", JSON.stringify(tokenUtxo, (_k, v) =>
  typeof v === "bigint" ? v.toString() : v
, 2));

// Type guard
console.log("isTokenUtxo:", isTokenUtxo(tokenUtxo)); // true

// Assertion — throws MintCoreError if the object is malformed
assertTokenUtxo(tokenUtxo);

// ── 4. Use metadata schema v1 ─────────────────────────────────────────────

// MetadataSchema v1 is a minimal, versioned metadata structure for CashTokens
// assets. It pairs well with a TokenUtxo to describe the token off-chain.
const metadata: MetadataSchema = {
  version: 1,
  name: "Dragon Scale",
  description: "A rare crafting material dropped by ancient dragons",
  attributes: {
    material: "scale",
    element: "fire",
    durability: 95,
  },
};

// Assertion — throws MintCoreError if the schema is malformed
assertMetadataSchema(metadata);

console.log("\nMetadataSchema:", JSON.stringify(metadata, null, 2));
console.log("\nDone.");
