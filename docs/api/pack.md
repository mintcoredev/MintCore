# API Reference — Pack Interfaces (`src/packs/pack.ts`)

Data-only interfaces for pack definitions, with type guards and validation helpers.
No pack-opening logic, RNG, or rarity weighting is included.

---

## Type Definitions

### `PackId`

```ts
type PackId = string;
```

A string that uniquely identifies a pack definition. No format is enforced.

---

### `PackMetadata`

```ts
interface PackMetadata {
  name: string;            // Human-readable pack name (non-empty)
  description?: string;   // Optional short description
  image?: string;         // Optional URI to an image or icon
  attributes?: Record<string, unknown>; // Arbitrary key-value pairs
}
```

---

### `PackDefinition`

```ts
interface PackDefinition {
  id: PackId;                 // Stable identifier
  metadata: PackMetadata;     // Display and descriptive metadata
  items: ItemDefinition[];    // Item definitions contained in this pack
  version: number;            // Positive integer schema version
}
```

---

## Function Signatures

### Type guards

```ts
function isPackMetadata(value: unknown): value is PackMetadata
function isPackDefinition(value: unknown): value is PackDefinition
```

### Assertion helper

```ts
function assertPackDefinition(value: unknown): asserts value is PackDefinition
```

Throws `MintCoreError` on the first constraint violation.

---

## Usage Examples

```ts
import { Rarity, isPackDefinition, assertPackDefinition } from "mintcore";

const pack = {
  id: "starter-pack",
  version: 1,
  metadata: { name: "Starter Pack", description: "A beginner-friendly pack." },
  items: [
    {
      id: "sword-01",
      version: 1,
      rarity: Rarity.Common,
      metadata: { name: "Rusty Sword" },
    },
  ],
};

// Narrow an unknown value
if (isPackDefinition(pack)) {
  console.log(pack.metadata.name, pack.items.length);
}

// Assert — throws MintCoreError if invalid
assertPackDefinition(pack);
```
