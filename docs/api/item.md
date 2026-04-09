# API Reference — Item Interfaces (`src/items/item.ts`)

Data-only interfaces for individual items within a pack, with type guards and validation helpers.

---

## Type Definitions

### `ItemId`

```ts
type ItemId = string;
```

A string that uniquely identifies an item definition. No format is enforced.

---

### `ItemMetadata`

```ts
interface ItemMetadata {
  name: string;            // Human-readable item name (non-empty)
  description?: string;   // Optional short description
  image?: string;         // Optional URI to an image or icon
  attributes?: Record<string, unknown>; // Arbitrary key-value pairs
}
```

---

### `ItemDefinition`

```ts
interface ItemDefinition {
  id: ItemId;             // Stable identifier
  metadata: ItemMetadata; // Display and descriptive metadata
  rarity: Rarity;         // Descriptive rarity tier (no weighting semantics)
  version: number;        // Positive integer schema version
}
```

---

## Function Signatures

### Type guards

```ts
function isItemMetadata(value: unknown): value is ItemMetadata
function isItemDefinition(value: unknown): value is ItemDefinition
```

### Assertion helper

```ts
function assertItemDefinition(value: unknown): asserts value is ItemDefinition
```

Throws `MintCoreError` on the first constraint violation.

---

## Usage Examples

```ts
import { Rarity, isItemDefinition, assertItemDefinition } from "mintcore";

const item = {
  id: "sword-01",
  version: 1,
  rarity: Rarity.Rare,
  metadata: { name: "Sword of Dawn", description: "A gleaming blade." },
};

// Narrow an unknown value
if (isItemDefinition(item)) {
  console.log(item.metadata.name);
}

// Assert — throws MintCoreError if invalid
assertItemDefinition(item);
```
