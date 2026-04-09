# Covenant Interfaces

**Source:** `src/covenants/interfaces/index.ts`  
**Exported from:** `"mintcore"`

Structural interfaces that describe covenant behaviour in MintCore. This module is **data-only** — no script generation, no enforcement logic, and no blockchain RPC calls.

---

## Interfaces

### `CovenantCondition`

```ts
interface CovenantCondition {
  /** Discriminant string identifying the kind of condition. */
  type: string;
  /** Arbitrary parameters required to evaluate this condition. */
  params?: Record<string, unknown>;
}
```

Describes a single rule that must be satisfied within a covenant.

`CovenantCondition` is intentionally generic. It carries a `type` tag that higher-level modules can interpret, plus an optional `params` bag for any extra data the condition requires. MintCore itself **never** evaluates or enforces conditions.

---

### `CovenantInputConstraint`

```ts
interface CovenantInputConstraint {
  /** Token identifiers that must be present among the transaction inputs. */
  requiredTokens?: TokenId[];
  /** Minimum total satoshi value that inputs must supply. */
  minSatoshis?: number;
  /** Additional application-defined conditions. */
  customConditions?: CovenantCondition[];
}
```

Describes constraints placed on the inputs of a covenanted transaction. All fields are optional; an empty object represents an unconstrained input set.

---

### `CovenantOutputConstraint`

```ts
interface CovenantOutputConstraint {
  /** Locking-script addresses that outputs are permitted to target. */
  allowedRecipients?: string[];
  /**
   * Required distribution of tokens across outputs.
   * Maps each TokenId to the number of output UTXOs that must carry it.
   */
  requiredTokenDistribution?: Record<TokenId, number>;
  /** Additional application-defined conditions. */
  customConditions?: CovenantCondition[];
}
```

Describes constraints placed on the outputs of a covenanted transaction. All fields are optional; an empty object represents an unconstrained output set.

---

### `CovenantDefinition`

```ts
interface CovenantDefinition {
  /** Human-readable identifier for this covenant (non-empty). */
  name: string;
  /** Monotonically increasing integer version of this covenant definition. */
  version: number;
  /** Input constraints, applied in order. */
  inputs: CovenantInputConstraint[];
  /** Output constraints, applied in order. */
  outputs: CovenantOutputConstraint[];
  /** Arbitrary key-value metadata for consumer use. */
  metadata?: Record<string, unknown>;
}
```

The complete, versioned description of a covenant. A `CovenantDefinition` is **pure data**: it describes *what* a covenant requires, but contains no script bytecode and no enforcement logic. Script generation and on-chain enforcement are the responsibility of application-layer modules that consume this definition.

---

## Type Guards

```ts
function isCovenantCondition(value: unknown): value is CovenantCondition
function isCovenantInputConstraint(value: unknown): value is CovenantInputConstraint
function isCovenantOutputConstraint(value: unknown): value is CovenantOutputConstraint
function isCovenantDefinition(value: unknown): value is CovenantDefinition
```

Return `true` when the input satisfies the corresponding interface shape. Safe to call on untrusted `unknown` values.

---

## Assertion Helpers

```ts
function assertCovenantCondition(value: unknown): asserts value is CovenantCondition
function assertCovenantDefinition(value: unknown): asserts value is CovenantDefinition
```

Throw `MintCoreError` on the first constraint violation with a descriptive message.

---

## Example

```ts
import {
  CovenantDefinition,
  CovenantInputConstraint,
  CovenantOutputConstraint,
  isCovenantDefinition,
  assertCovenantDefinition,
  toTokenId,
} from "mintcore";

const tokenId = toTokenId(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

const input: CovenantInputConstraint = {
  requiredTokens: [tokenId],
  minSatoshis: 1000,
};

const output: CovenantOutputConstraint = {
  allowedRecipients: ["bitcoincash:qexampleaddress..."],
  requiredTokenDistribution: { [tokenId]: 1 },
};

const definition: CovenantDefinition = {
  name: "TransferCovenant",
  version: 1,
  inputs: [input],
  outputs: [output],
  metadata: { description: "Single-token transfer constraint" },
};

if (isCovenantDefinition(definition)) {
  console.log(definition.name); // "TransferCovenant"
}

assertCovenantDefinition(definition);
```
