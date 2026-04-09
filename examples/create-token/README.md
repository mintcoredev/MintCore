# create-token Example

Demonstrates creating a `TokenId`, constructing a `TokenUtxo`, and using the
metadata schema v1.

No blockchain RPC calls. No minting. Pure TypeScript data construction.

## Run

```bash
npx ts-node index.ts
# or
node --loader ts-node/esm index.ts
```

## What It Shows

- `toTokenId` / `toTokenCategory` / `toTokenAmount` coercions
- Building a `TokenUtxo` object
- Building a `MetadataSchema` v1 object
- Type guards and assertion helpers
