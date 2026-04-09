# Items

**Source:** `src/items/item.ts`  
**Exported from:** `"mintcore"`

`ItemDefinition` and its supporting types describe individual items within a CashTokens-based asset pack. This module is **data-only** — no selection logic, no RNG, no game mechanics.

---

## Types

### `ItemId`

```ts
type ItemId = string;
```

A string that uniquely identifies an item definition within a system. No format is enforced; consumers may use UUIDs, slugs, or any stable key.

---

### `ItemMetadata`

```ts
interface ItemMetadata {
  /** Human-readable item name (non-empty). */
  name: string;
  /** Optional short description of the item. */
  description?: string;
  /** Optional URI pointing to an image or icon for the item. */
  image?: string;
  /** Arbitrary key-value attributes for extensibility. */
  attributes?: Record<string, unknown>;
}
```

Display and descriptive metadata for an item.

---

### `ItemDefinition`

```ts
interface ItemDefinition {
  /** Stable identifier for this item definition. */
  id: ItemId;
  /** Display and descriptive metadata. */
  metadata: ItemMetadata;
  /** Descriptive rarity tier. Carries no probability or weighting semantics. */
  rarity: Rarity;
  /** Schema version. Must be a positive integer. */
  version: number;
}
```

A complete, versioned definition of an item. `ItemDefinition` is **pure data** — it describes what an item *is*, not how it behaves. All functional logic (minting, selection, etc.) belongs in application-layer modules.

---

## Type Guards

```ts
function isItemMetadata(value: unknown): value is ItemMetadata
function isItemDefinition(value: unknown): value is ItemDefinition
```

Return `true` when the input satisfies the corresponding interface shape. Safe to call on untrusted `unknown` values.

---

## Assertion Helpers

```ts
function assertItemDefinition(value: unknown): asserts value is ItemDefinition
```

Throws `MintCoreError` on the first constraint violation with a descriptive message.

---

## Example

```ts
import {
  ItemDefinition,
  isItemDefinition,
  assertItemDefinition,
  serializeItem,
  Rarity,
} from "mintcore";

const item: ItemDefinition = {
  id: "dragon-scale-001",
  version: 1,
  rarity: Rarity.Epic,
  metadata: {
    name: "Dragon Scale",
    description: "A rare crafting material dropped by ancient dragons",
    image: "ipfs://bafybeiscale...",
    attributes: {
      material: "scale",
      element: "fire",
      durability: 95,
    },
  },
};

// Type guard
if (isItemDefinition(item)) {
  console.log(item.rarity); // Rarity.Epic (3)
}

// Assertion — throws MintCoreError if invalid
assertItemDefinition(item);

// Serialize to JSON string
const json = serializeItem(item);
console.log(json);
```
