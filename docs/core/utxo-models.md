# UTXO Models

**Source:** `src/types/UtxoTypes.ts`  
**Exported from:** `"mintcore"`

Base UTXO and token-bearing UTXO interfaces with type guards and validation helpers. All types align with standard BCH UTXO conventions.

---

## Interfaces

### `BaseUtxo`

```ts
interface BaseUtxo {
  /** Transaction id in display (reversed) byte order — 64 lowercase hex chars. */
  txid: string;
  /** Output index within the transaction (non-negative integer). */
  vout: number;
  /** Value in satoshis (finite non-negative integer). */
  satoshis: number;
  /** Output locking bytecode as a lowercase hex string (may be empty). */
  lockingScript: string;
}
```

The minimal UTXO representation used throughout MintCore. All fields are required. `lockingScript` is an even-length lowercase hex string (an empty string represents an empty script).

---

### `UtxoTokenData`

```ts
interface UtxoTokenData {
  /** Token category (genesis txid as 64-char lowercase hex). */
  category: TokenCategory;
  /**
   * Fungible token amount. Omit when the output carries no fungible balance.
   */
  amount?: TokenAmount;
  /** NFT data; present only when this output carries an NFT. */
  nft?: {
    capability: NftCapability;
    /**
     * Commitment bytes as a lowercase hex string (up to 40 bytes / 80 hex chars).
     * Empty string means no commitment data.
     */
    commitment: string;
  };
}
```

Token data attached to a `TokenUtxo`. A token UTXO may carry fungible tokens, an NFT, or both simultaneously.

---

### `TokenUtxo`

```ts
interface TokenUtxo extends BaseUtxo {
  token: UtxoTokenData;
}
```

A UTXO that carries CashTokens data (fungible, non-fungible, or both). Extends `BaseUtxo` with a required `token` field.

---

## Type Guards

```ts
function isBaseUtxo(value: unknown): value is BaseUtxo
function isTokenUtxo(value: unknown): value is TokenUtxo
```

Return `true` when the input matches the corresponding interface shape.

`isBaseUtxo` checks:
- `txid` is a 64-character lowercase hex string
- `vout` is a non-negative integer
- `satoshis` is a finite non-negative integer
- `lockingScript` is an even-length lowercase hex string

`isTokenUtxo` performs all `isBaseUtxo` checks and additionally verifies:
- `token.category` is a 64-char lowercase hex string
- `token.amount` is a non-negative bigint (when present)
- `token.nft.capability` is a valid `NftCapability` (when present)
- `token.nft.commitment` is an even-length lowercase hex string (when present)

---

## Assertion Helpers

```ts
function assertBaseUtxo(value: unknown): asserts value is BaseUtxo
function assertTokenUtxo(value: unknown): asserts value is TokenUtxo
```

Throw `MintCoreError` on the first constraint violation with a descriptive message indicating which field failed.

---

## Examples

```ts
import {
  isBaseUtxo,
  isTokenUtxo,
  assertBaseUtxo,
  assertTokenUtxo,
  toTokenCategory,
  toTokenAmount,
} from "mintcore";

const category = toTokenCategory(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

// Construct a base UTXO
const baseUtxo = {
  txid: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  vout: 0,
  satoshis: 10_000,
  lockingScript: "76a914" + "00".repeat(20) + "88ac",
};

// Type guard
if (isBaseUtxo(baseUtxo)) {
  console.log(baseUtxo.satoshis); // 10000
}

// Assertion — throws MintCoreError if invalid
assertBaseUtxo(baseUtxo);

// Construct a token-bearing UTXO
const tokenUtxo = {
  ...baseUtxo,
  token: {
    category,
    amount: toTokenAmount(500n),
    nft: {
      capability: "none" as const,
      commitment: "deadbeef",
    },
  },
};

if (isTokenUtxo(tokenUtxo)) {
  console.log(tokenUtxo.token.category);
}

assertTokenUtxo(tokenUtxo);
```
