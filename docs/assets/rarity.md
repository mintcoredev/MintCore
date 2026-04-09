# Rarity

**Source:** `src/rarity/rarity.ts`  
**Exported from:** `"mintcore"`

A descriptive rarity enum and pure helper functions. This module is **data-only** — no randomness, no weighting, no selection logic.

---

## `Rarity` Enum

```ts
enum Rarity {
  Common    = 0,
  Uncommon  = 1,
  Rare      = 2,
  Epic      = 3,
  Legendary = 4,
}
```

Descriptive rarity tiers for items. Values are numeric so they can be stored, serialised, and compared without extra mapping. They carry **no probability or weighting semantics**.

| Member | Value | Description |
|--------|-------|-------------|
| `Common` | `0` | The most frequently occurring tier |
| `Uncommon` | `1` | Slightly less common than Common |
| `Rare` | `2` | Notable items with limited supply |
| `Epic` | `3` | High-value items with very limited supply |
| `Legendary` | `4` | Exceptionally scarce, top-tier items |

---

## Functions

### `isRarity`

```ts
function isRarity(value: unknown): value is Rarity
```

Type guard. Returns `true` when `value` is a valid `Rarity` member (i.e. one of `0`, `1`, `2`, `3`, `4`).

---

### `rarityToString`

```ts
function rarityToString(r: Rarity): string
```

Returns the human-readable name of a `Rarity` value.

**Throws** `MintCoreError` when `r` is not a valid `Rarity` member.

---

## Examples

```ts
import { Rarity, isRarity, rarityToString } from "mintcore";

// Use enum members directly
const tier = Rarity.Epic; // 3

// Type guard — useful for validating external/serialized data
if (isRarity(someValue)) {
  console.log(rarityToString(someValue)); // "Common" | "Uncommon" | ...
}

// Convert to display string
console.log(rarityToString(Rarity.Legendary)); // "Legendary"
console.log(rarityToString(Rarity.Common));    // "Common"

// Compare rarity values numerically
if (Rarity.Epic > Rarity.Rare) {
  console.log("Epic is higher than Rare");
}

// Iterating over all tiers
const allRarities = [
  Rarity.Common,
  Rarity.Uncommon,
  Rarity.Rare,
  Rarity.Epic,
  Rarity.Legendary,
];

for (const r of allRarities) {
  console.log(`${r}: ${rarityToString(r)}`);
}
// 0: Common
// 1: Uncommon
// 2: Rare
// 3: Epic
// 4: Legendary
```
