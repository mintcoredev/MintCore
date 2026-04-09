# JSON Helpers

**Source:** `src/serialization/json.ts`  
**Exported from:** `"mintcore"`

Pure, deterministic serialization and deserialization for `PackDefinition` and `ItemDefinition` objects. All functions are side-effect free and dependency-light.

---

## Pack Serialization

### `serializePack`

```ts
function serializePack(pack: PackDefinition): string
```

Serialize a `PackDefinition` to a JSON string.

Validates the input before serializing; throws if the pack does not conform to the `PackDefinition` structure.

**Throws** `MintCoreError` when `pack` is not a valid `PackDefinition`.

---

### `deserializePack`

```ts
function deserializePack(json: string): PackDefinition
```

Deserialize a JSON string into a `PackDefinition`.

Parses the JSON and validates the resulting object against the `PackDefinition` structure.

**Throws** `MintCoreError` when `json` is not valid JSON or does not conform to the `PackDefinition` structure.

---

## Item Serialization

### `serializeItem`

```ts
function serializeItem(item: ItemDefinition): string
```

Serialize an `ItemDefinition` to a JSON string.

Validates the input before serializing; throws if the item does not conform to the `ItemDefinition` structure.

**Throws** `MintCoreError` when `item` is not a valid `ItemDefinition`.

---

### `deserializeItem`

```ts
function deserializeItem(json: string): ItemDefinition
```

Deserialize a JSON string into an `ItemDefinition`.

Parses the JSON and validates the resulting object against the `ItemDefinition` structure.

**Throws** `MintCoreError` when `json` is not valid JSON or does not conform to the `ItemDefinition` structure.

---

## Examples

### Serialize and deserialize a pack

```ts
import { PackDefinition, serializePack, deserializePack, Rarity } from "mintcore";

const pack: PackDefinition = {
  id: "warrior-pack-v1",
  version: 1,
  metadata: { name: "Warrior Pack", description: "Weapons and armor for warriors" },
  items: [
    {
      id: "iron-sword",
      version: 1,
      rarity: Rarity.Common,
      metadata: { name: "Iron Sword" },
    },
    {
      id: "steel-shield",
      version: 1,
      rarity: Rarity.Uncommon,
      metadata: { name: "Steel Shield" },
    },
  ],
};

// Serialize to JSON string
const json = serializePack(pack);
console.log(typeof json); // "string"

// Deserialize back to a typed PackDefinition
const restored = deserializePack(json);
console.log(restored.id); // "warrior-pack-v1"
console.log(restored.items.length); // 2
```

### Serialize and deserialize an item

```ts
import { ItemDefinition, serializeItem, deserializeItem, Rarity } from "mintcore";

const item: ItemDefinition = {
  id: "dragon-scale-001",
  version: 1,
  rarity: Rarity.Epic,
  metadata: {
    name: "Dragon Scale",
    attributes: { material: "scale", element: "fire" },
  },
};

const json = serializeItem(item);
const restored = deserializeItem(json);

console.log(restored.rarity); // 3 (Rarity.Epic)
console.log(restored.metadata.name); // "Dragon Scale"
```

### Error handling

```ts
import { deserializePack } from "mintcore";

try {
  deserializePack("not valid json");
} catch (e) {
  // MintCoreError: deserializePack: input is not valid JSON
}

try {
  deserializePack('{"id":""}'); // empty id
} catch (e) {
  // MintCoreError: PackDefinition.id must be a non-empty string
}
```
