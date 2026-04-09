# Covenant Builder

**Source:** `src/covenants/builder/index.ts`  
**Exported from:** `"mintcore"`

The abstract `CovenantBuilder` class provides a structural extension point for assembling `CovenantDefinition` objects. It does **not** generate scripts, enforce rules, or make any blockchain RPC calls.

---

## `CovenantBuilder` (abstract class)

```ts
abstract class CovenantBuilder {
  constructor(name: string, version: number)

  abstract defineInputs(): CovenantInputConstraint[]
  abstract defineOutputs(): CovenantOutputConstraint[]

  getMetadata(): Record<string, unknown>
  build(): CovenantDefinition
}
```

### Constructor

```ts
constructor(
  protected readonly name: string,
  protected readonly version: number
)
```

- `name` — human-readable covenant name (must be a non-empty string).
- `version` — positive integer version of this covenant definition.

---

### `defineInputs()` (abstract)

```ts
abstract defineInputs(): CovenantInputConstraint[]
```

Subclasses must implement this method to return the input constraints for the covenant. Return an empty array for unconstrained inputs.

---

### `defineOutputs()` (abstract)

```ts
abstract defineOutputs(): CovenantOutputConstraint[]
```

Subclasses must implement this method to return the output constraints for the covenant. Return an empty array for unconstrained outputs.

---

### `getMetadata()`

```ts
getMetadata(): Record<string, unknown>
```

Override to attach arbitrary metadata to the assembled `CovenantDefinition`. The default implementation returns an empty object (no metadata is attached).

---

### `build()`

```ts
build(): CovenantDefinition
```

Assemble and return a `CovenantDefinition` by calling `defineInputs()`, `defineOutputs()`, and `getMetadata()`.

**Throws** `MintCoreError` when:
- `name` is empty or not a string.
- `version` is not a positive integer.
- `defineInputs()` does not return an array.
- `defineOutputs()` does not return an array.

---

## Example

```ts
import {
  CovenantBuilder,
  CovenantInputConstraint,
  CovenantOutputConstraint,
  CovenantDefinition,
  toTokenId,
} from "mintcore";

const tokenId = toTokenId(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

class SimpleTransferCovenant extends CovenantBuilder {
  constructor() {
    super("SimpleTransfer", 1);
  }

  defineInputs(): CovenantInputConstraint[] {
    return [
      {
        requiredTokens: [tokenId],
        minSatoshis: 1000,
      },
    ];
  }

  defineOutputs(): CovenantOutputConstraint[] {
    return [
      {
        allowedRecipients: ["bitcoincash:qexampleaddress..."],
        requiredTokenDistribution: { [tokenId]: 1 },
      },
    ];
  }

  override getMetadata(): Record<string, unknown> {
    return { description: "A simple single-token transfer covenant" };
  }
}

const builder = new SimpleTransferCovenant();
const definition: CovenantDefinition = builder.build();

console.log(definition.name);    // "SimpleTransfer"
console.log(definition.version); // 1
console.log(definition.inputs);  // [{ requiredTokens: [...], minSatoshis: 1000 }]
```
