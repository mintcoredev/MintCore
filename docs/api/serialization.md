# API Reference — Serialization Helpers (`src/serialization/json.ts`)

Pure, deterministic JSON serialization and deserialization for pack and item definitions.
All functions validate input and throw `MintCoreError` on invalid data.

---

## Function Signatures

### Pack serialization

```ts
function serializePack(pack: PackDefinition): string
function deserializePack(json: string): PackDefinition
```

### Item serialization

```ts
function serializeItem(item: ItemDefinition): string
function deserializeItem(json: string): ItemDefinition
```

---

## Usage Examples

```ts
import {
  Rarity,
  PackDefinition,
  serializePack,
  deserializePack,
  serializeItem,
  deserializeItem,
} from "mintcore";

// Serialize a pack
const pack: PackDefinition = {
  id: "starter-pack",
  version: 1,
  metadata: { name: "Starter Pack" },
  items: [],
};

const json = serializePack(pack);
// '{"id":"starter-pack","version":1,"metadata":{"name":"Starter Pack"},"items":[]}'

// Deserialize — throws MintCoreError if json is invalid or does not match PackDefinition
const restored = deserializePack(json);
console.log(restored.id); // "starter-pack"

// Serialize an item
const item = {
  id: "sword-01",
  version: 1,
  rarity: Rarity.Rare,
  metadata: { name: "Sword of Dawn" },
};

const itemJson = serializeItem(item);
const restoredItem = deserializeItem(itemJson);
console.log(restoredItem.metadata.name); // "Sword of Dawn"
```

---

## Error Handling

All four functions throw `MintCoreError` when:

- The input to a serialize function fails structural validation.
- The string passed to a deserialize function is not valid JSON.
- The parsed JSON does not conform to the expected interface.
