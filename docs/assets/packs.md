# Packs

**Source:** `src/packs/pack.ts`  
**Exported from:** `"mintcore"`

`PackDefinition` and its supporting types describe the contents of a pack in a CashTokens-based asset system. This module is **data-only** — it carries no pack-opening logic, no RNG, and no rarity weighting.

---

## Types

### `PackId`

```ts
type PackId = string;
```

A string that uniquely identifies a pack definition within a system. No format is enforced; consumers may use UUIDs, slugs, or any stable key.

---

### `PackMetadata`

```ts
interface PackMetadata {
  /** Human-readable pack name (non-empty). */
  name: string;
  /** Optional short description of the pack. */
  description?: string;
  /** Optional URI pointing to an image or icon for the pack. */
  image?: string;
  /** Arbitrary key-value attributes for extensibility. */
  attributes?: Record<string, unknown>;
}
```

Display and descriptive metadata for a pack.

---

### `PackDefinition`

```ts
interface PackDefinition {
  /** Stable identifier for this pack definition. */
  id: PackId;
  /** Display and descriptive metadata. */
  metadata: PackMetadata;
  /** The item definitions contained in this pack. */
  items: ItemDefinition[];
  /** Schema version. Must be a positive integer. */
  version: number;
}
```

A complete, versioned definition of a pack. `PackDefinition` is **pure data** — it describes the contents of a pack, not how packs are opened or distributed. All functional logic (opening, RNG, rarity selection) belongs in application-layer modules built on top of the SDK.

---

## Type Guards

```ts
function isPackMetadata(value: unknown): value is PackMetadata
function isPackDefinition(value: unknown): value is PackDefinition
```

Return `true` when the input satisfies the corresponding interface shape. Safe to call on untrusted `unknown` values.

---

## Assertion Helpers

```ts
function assertPackDefinition(value: unknown): asserts value is PackDefinition
```

Throws `MintCoreError` on the first constraint violation with a descriptive message.

---

## Example

```ts
import {
  PackDefinition,
  isPackDefinition,
  assertPackDefinition,
  serializePack,
  Rarity,
} from "mintcore";

const pack: PackDefinition = {
  id: "starter-pack-v1",
  version: 1,
  metadata: {
    name: "Starter Pack",
    description: "A beginner pack with common items",
    image: "ipfs://bafybeistarter...",
    attributes: { theme: "fantasy" },
  },
  items: [
    {
      id: "iron-sword",
      version: 1,
      rarity: Rarity.Common,
      metadata: { name: "Iron Sword" },
    },
    {
      id: "health-potion",
      version: 1,
      rarity: Rarity.Common,
      metadata: { name: "Health Potion" },
    },
  ],
};

// Type guard
if (isPackDefinition(pack)) {
  console.log(pack.metadata.name); // "Starter Pack"
}

// Assertion — throws MintCoreError if invalid
assertPackDefinition(pack);

// Serialize to JSON
const json = serializePack(pack);
console.log(json);
```
