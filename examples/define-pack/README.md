# define-pack Example

Demonstrates creating a `PackDefinition`, adding `ItemDefinitions`, using the
`Rarity` enum, and serializing to JSON.

No blockchain RPC calls. No pack-opening logic. No RNG.

## Run

```bash
npx ts-node index.ts
# or
node --loader ts-node/esm index.ts
```

## What It Shows

- Building `ItemDefinition` objects with `Rarity` tiers
- Building a `PackDefinition` with multiple items
- Serializing a pack to a JSON string with `serializePack`
- Deserializing back with `deserializePack`
- Type guards and assertion helpers
