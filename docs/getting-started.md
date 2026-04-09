# Getting Started with MintCore

MintCore is a minimal, stable TypeScript SDK for building CashTokens-based asset systems on Bitcoin Cash. It handles token primitives, UTXO models, pack and item definitions, covenant structures, and serialization — with no UI, no RNG, and no blockchain RPC calls required for data modeling.

---

## Installation

```bash
npm install mintcore
```

Requires **Node.js 18+** and an ESM-compatible build environment.

---

## Basic Usage

Import what you need directly from `"mintcore"`:

```ts
import {
  toTokenId,
  toTokenAmount,
  toTokenCategory,
  MetadataSchema,
} from "mintcore";
```

All public types, interfaces, and helpers are available from the top-level package entry point.

---

## Minimal Examples

### Create a token identifier

```ts
import { toTokenId, toTokenCategory, toTokenAmount } from "mintcore";

// Cast a 64-char lowercase hex genesis txid to a branded TokenId
const id = toTokenId(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

// Cast to a TokenCategory (same format, different semantic intent)
const category = toTokenCategory(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

// Non-negative fungible token amount as bigint
const amount = toTokenAmount(1_000_000n);
```

### Build metadata (v1 schema)

```ts
import { MetadataSchema, assertMetadataSchema } from "mintcore";

const meta: MetadataSchema = {
  version: 1,
  name: "Dragon Scale",
  description: "A rare crafting material",
  attributes: { material: "scale", element: "fire" },
};

// Throws MintCoreError if invalid
assertMetadataSchema(meta);
```

### Serialize a pack

```ts
import { PackDefinition, serializePack, Rarity } from "mintcore";

const pack: PackDefinition = {
  id: "starter-pack-v1",
  version: 1,
  metadata: { name: "Starter Pack" },
  items: [
    {
      id: "item-001",
      version: 1,
      rarity: Rarity.Common,
      metadata: { name: "Iron Sword" },
    },
  ],
};

const json = serializePack(pack);
console.log(json);
```

---

## Next Steps

- [Token Primitives](./core/token-primitives.md) — branded types, type guards, and validators
- [UTXO Models](./core/utxo-models.md) — BaseUtxo, TokenUtxo, and assertion helpers
- [Transaction Builder](./core/transaction-builder.md) — building and signing genesis transactions
- [Packs](./assets/packs.md) — PackDefinition and PackMetadata
- [Items](./assets/items.md) — ItemDefinition and ItemMetadata
- [Rarity](./assets/rarity.md) — Rarity enum and helpers
- [Covenant Interfaces](./covenants/covenant-interfaces.md) — CovenantDefinition and constraints
- [Covenant Builder](./covenants/covenant-builder.md) — abstract CovenantBuilder class
- [Covenant Utils](./covenants/covenant-utils.md) — hashing and metadata encoding
- [JSON Helpers](./serialization/json-helpers.md) — deterministic serialization
