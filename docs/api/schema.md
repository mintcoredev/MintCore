# API Reference — Metadata Schema (`src/types/MetadataSchema.ts`)

A lightweight, versioned metadata structure for CashTokens-based assets.

---

## Type Definitions

### `MetadataSchema`

```ts
interface MetadataSchema {
  /** Schema version. Must be a positive integer. Always `1` for v1 documents. */
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
```

The schema is intentionally minimal. Extended metadata (icons, localised names, URIs) belongs in a [CHIP-BCMR v2](https://github.com/bitjson/chip-bcmr) document referenced via `TokenSchema.bcmrUri`.

---

## Function Signatures

### Type guard

```ts
function isMetadataSchema(value: unknown): value is MetadataSchema
```

Returns `true` when `value` satisfies all `MetadataSchema` constraints:

- `version` is a positive integer
- `name` is a non-empty string
- `description`, if present, is a string
- `attributes`, if present, is a plain object with non-empty string keys

### Assertion helper

```ts
function assertMetadataSchema(value: unknown): asserts value is MetadataSchema
```

Throws `MintCoreError` on the first constraint violation with a descriptive message.

---

## Usage Examples

```ts
import { isMetadataSchema, assertMetadataSchema } from "mintcore";

// Build a minimal v1 metadata document
const meta: MetadataSchema = {
  version: 1,
  name: "Sword of Dawn",
  description: "A legendary weapon forged in the fires of genesis.",
  attributes: {
    rarity: "legendary",
    power: 9000,
    tradeable: true,
  },
};

// Type guard usage
if (isMetadataSchema(meta)) {
  console.log("Valid metadata schema v", meta.version);
}

// Assertion usage — throws MintCoreError if invalid
assertMetadataSchema(meta);

// Pass as part of a TokenSchema
import { mintNFT } from "mintcore";

await mintNFT(config, {
  name: "Sword of Dawn",
  symbol: "SWORD",
  decimals: 0,
  initialSupply: 1n,
  nft: { capability: "none", commitment: "" },
  metadata: meta.attributes, // attach attributes to the on-chain token
});
```
