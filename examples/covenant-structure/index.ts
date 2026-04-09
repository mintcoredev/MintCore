/**
 * covenant-structure example
 *
 * Demonstrates:
 *   - Using CovenantBuilder (abstract)
 *   - Defining input/output constraints
 *   - Hashing a CovenantDefinition
 *   - Encoding/decoding metadata
 *
 * No blockchain RPC calls. No covenant templates. No script generation.
 */

import {
  CovenantBuilder,
  hashCovenantDefinition,
  encodeCovenantMetadata,
  decodeCovenantMetadata,
  isCovenantDefinition,
  assertCovenantDefinition,
  toTokenId,
} from "mintcore";
import type {
  CovenantDefinition,
  CovenantInputConstraint,
  CovenantOutputConstraint,
} from "mintcore";

// ── 1. Define a CovenantBuilder subclass ───────────────────────────────────

// CovenantBuilder is an abstract class. Subclasses must implement
// defineInputs() and defineOutputs(). Optionally override getMetadata().
//
// The builder produces a CovenantDefinition — pure data describing what a
// covenant requires. No script generation or enforcement happens here.

const exampleTokenId = toTokenId(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

class ItemTransferCovenant extends CovenantBuilder {
  constructor() {
    super("ItemTransfer", 1);
  }

  defineInputs(): CovenantInputConstraint[] {
    // Require the transaction to include the item token as an input
    return [
      {
        requiredTokens: [exampleTokenId],
        minSatoshis: 1000,
        customConditions: [
          { type: "senderOwnsItem", params: { tokenId: exampleTokenId } },
        ],
      },
    ];
  }

  defineOutputs(): CovenantOutputConstraint[] {
    // Require exactly one output carrying the item token to an allowed address
    return [
      {
        allowedRecipients: ["bitcoincash:qrecipientaddressexample..."],
        requiredTokenDistribution: { [exampleTokenId]: 1 },
      },
    ];
  }

  override getMetadata(): Record<string, unknown> {
    return {
      description: "Transfers a single item token to an allowed recipient",
      author: "mintcore-example",
      version: "1.0.0",
    };
  }
}

// ── 2. Build the CovenantDefinition ────────────────────────────────────────

const builder = new ItemTransferCovenant();
const definition: CovenantDefinition = builder.build();

console.log("CovenantDefinition name:", definition.name);
console.log("CovenantDefinition version:", definition.version);
console.log("Inputs:", JSON.stringify(definition.inputs, null, 2));
console.log("Outputs:", JSON.stringify(definition.outputs, null, 2));
console.log("Metadata:", definition.metadata);

// Type guard
console.log("\nisCovenantDefinition:", isCovenantDefinition(definition));

// Assertion — throws MintCoreError if the definition is malformed
assertCovenantDefinition(definition);

// ── 3. Hash the CovenantDefinition ─────────────────────────────────────────

// hashCovenantDefinition computes a SHA-256 fingerprint of the definition's
// JSON serialization. Use this hash for off-chain storage, comparison, or
// as a stable reference identifier.
const hash = hashCovenantDefinition(definition);
console.log("\nCovenant SHA-256 hash:", hash);

// Hashing is deterministic — the same definition always produces the same hash
const hash2 = hashCovenantDefinition(builder.build());
console.log("Hash is stable (hash === hash2):", hash === hash2);

// ── 4. Encode and decode covenant metadata ─────────────────────────────────

// encodeCovenantMetadata serializes a plain object to JSON and Base64-encodes
// it. Suitable for embedding in URIs, headers, or OP_RETURN payloads.
const meta = {
  covenantHash: hash,
  description: "ItemTransfer covenant for the warrior-starter-pack",
  tags: ["game", "items", "transfer"],
};

const encoded = encodeCovenantMetadata(meta);
console.log("\nEncoded metadata (Base64):", encoded);

const decoded = decodeCovenantMetadata(encoded);
console.log("Decoded metadata:", decoded);
console.log("Round-trip covenantHash matches:", decoded.covenantHash === hash);

console.log("\nDone.");
