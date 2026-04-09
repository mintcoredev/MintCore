# covenant-structure Example

Demonstrates using the abstract `CovenantBuilder`, defining input/output
constraints, hashing a `CovenantDefinition`, and encoding/decoding metadata.

No blockchain RPC calls. No covenant templates. No script generation.

## Run

```bash
npx ts-node index.ts
# or
node --loader ts-node/esm index.ts
```

## What It Shows

- Subclassing the abstract `CovenantBuilder`
- Defining `CovenantInputConstraint` and `CovenantOutputConstraint`
- Calling `build()` to assemble a `CovenantDefinition`
- Hashing a `CovenantDefinition` with `hashCovenantDefinition`
- Encoding/decoding metadata with `encodeCovenantMetadata` / `decodeCovenantMetadata`
