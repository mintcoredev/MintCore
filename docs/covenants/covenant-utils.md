# Covenant Utils

**Source:** `src/covenants/utils/index.ts`  
**Exported from:** `"mintcore"`

Pure utility functions for covenant-related data manipulation. These helpers are intentionally generic and not tied to any specific covenant template. No script generation, no blockchain RPC calls.

---

## Functions

### `hashCovenantDefinition`

```ts
function hashCovenantDefinition(def: CovenantDefinition): string
```

Compute a SHA-256 hash of a `CovenantDefinition`.

The hash is derived from the JSON serialisation of the definition and returned as a **64-character lowercase hex string**. Use this value to produce a stable fingerprint of a covenant for storage, comparison, or off-chain bookkeeping.

Does **not** generate or validate scripts.

**Returns** A 64-character lowercase hex string (32-byte SHA-256 digest).

---

### `encodeCovenantMetadata`

```ts
function encodeCovenantMetadata(meta: Record<string, unknown>): string
```

Encode covenant metadata as a Base64 string.

Serialises `meta` to JSON and encodes the result as Base64. The returned string is safe for use in URIs, HTTP headers, and OP_RETURN payloads.

**Returns** A Base64-encoded string.

**Throws** `MintCoreError` when `meta` is not a plain object.

---

### `decodeCovenantMetadata`

```ts
function decodeCovenantMetadata(encoded: string): Record<string, unknown>
```

Decode a Base64-encoded covenant metadata string produced by `encodeCovenantMetadata`.

Reverses `encodeCovenantMetadata`: Base64-decodes the input and parses the resulting JSON.

**Returns** The decoded metadata object.

**Throws** `MintCoreError` when `encoded` is not a valid Base64-encoded JSON object.

---

## Examples

### Hashing a CovenantDefinition

```ts
import {
  CovenantBuilder,
  CovenantInputConstraint,
  CovenantOutputConstraint,
  hashCovenantDefinition,
  toTokenId,
} from "mintcore";

const tokenId = toTokenId(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

class MyCovenant extends CovenantBuilder {
  constructor() { super("MyCovenant", 1); }
  defineInputs(): CovenantInputConstraint[] {
    return [{ minSatoshis: 1000 }];
  }
  defineOutputs(): CovenantOutputConstraint[] {
    return [{ allowedRecipients: ["bitcoincash:qexampleaddress..."] }];
  }
}

const definition = new MyCovenant().build();
const hash = hashCovenantDefinition(definition);

console.log(hash); // 64-char hex string, e.g. "3b4c5d6e..."
```

### Encoding and decoding metadata

```ts
import { encodeCovenantMetadata, decodeCovenantMetadata } from "mintcore";

const meta = {
  description: "Transfer covenant for game items",
  author: "mintcore-example",
  tags: ["game", "items"],
};

const encoded = encodeCovenantMetadata(meta);
console.log(encoded); // Base64 string

const decoded = decodeCovenantMetadata(encoded);
console.log(decoded.description); // "Transfer covenant for game items"
```
