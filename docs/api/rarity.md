# API Reference — Rarity Model (`src/rarity/rarity.ts`)

Descriptive rarity tiers for items with pure helper functions.
No probability, weighting, or selection logic is included.

---

## Type Definitions

### `Rarity`

```ts
enum Rarity {
  Common    = 0,
  Uncommon  = 1,
  Rare      = 2,
  Epic      = 3,
  Legendary = 4,
}
```

Numeric enum so values can be stored, serialised, and compared without extra mapping.
The values carry no probability or weighting semantics.

---

## Function Signatures

### `isRarity`

```ts
function isRarity(value: unknown): value is Rarity
```

Type guard. Returns `true` when `value` is a valid `Rarity` member.

### `rarityToString`

```ts
function rarityToString(r: Rarity): string
```

Returns the human-readable name for a `Rarity` value.
Throws `MintCoreError` when `r` is not a valid member.

---

## Usage Examples

```ts
import { Rarity, isRarity, rarityToString } from "mintcore";

// Check whether an unknown value is a valid rarity
if (isRarity(maybeRarity)) {
  console.log(rarityToString(maybeRarity)); // e.g. "Rare"
}

// Convert to string directly
rarityToString(Rarity.Legendary); // "Legendary"
rarityToString(Rarity.Common);    // "Common"
```
