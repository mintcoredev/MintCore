# API Reference — UTXO Models (`src/types/UtxoTypes.ts`)

Base UTXO and token-bearing UTXO interfaces with type guards and validation helpers.

---

## Type Definitions

### `BaseUtxo`

```ts
interface BaseUtxo {
  txid: string;        // 64-char lowercase hex (display byte order)
  vout: number;        // output index, non-negative integer
  satoshis: number;    // value in satoshis, non-negative integer
  lockingScript: string; // even-length lowercase hex locking bytecode
}
```

The minimal UTXO representation used throughout MintCore. Fields align with standard BCH UTXO conventions.

---

### `UtxoTokenData`

```ts
interface UtxoTokenData {
  category: TokenCategory; // genesis txid, 64-char lowercase hex
  amount?: TokenAmount;    // fungible token balance (omitted for pure NFT outputs)
  nft?: {
    capability: NftCapability;
    commitment: string;    // up to 80 hex chars (40 bytes); empty = no commitment
  };
}
```

Token data attached to a `TokenUtxo`. A token output may carry fungible tokens, an NFT, or both simultaneously.

---

### `TokenUtxo`

```ts
interface TokenUtxo extends BaseUtxo {
  token: UtxoTokenData;
}
```

A UTXO that carries CashTokens data. Extends `BaseUtxo` with the `token` field.

---

## Function Signatures

### Type guards

```ts
function isBaseUtxo(value: unknown): value is BaseUtxo
function isTokenUtxo(value: unknown): value is TokenUtxo
```

### Assertion helpers

```ts
function assertBaseUtxo(value: unknown): asserts value is BaseUtxo
function assertTokenUtxo(value: unknown): asserts value is TokenUtxo
```

Throw `MintCoreError` on the first constraint violation.

---

## Usage Examples

```ts
import { isBaseUtxo, isTokenUtxo, assertTokenUtxo } from "mintcore";

// Narrow an unknown value to a BaseUtxo
function processUtxo(raw: unknown) {
  if (isBaseUtxo(raw)) {
    console.log(raw.txid, raw.satoshis);
  }
}

// Assert a token UTXO — throws MintCoreError if the shape is invalid
const utxo = {
  txid: "a1b2...c3d4", // 64-char hex
  vout: 0,
  satoshis: 1000,
  lockingScript: "76a914...88ac",
  token: {
    category: "a1b2...c3d4",
    amount: 500n,
  },
};
assertTokenUtxo(utxo);
// utxo is narrowed to TokenUtxo beyond this point

// Check whether an output is a token-bearing UTXO
if (isTokenUtxo(utxo)) {
  console.log("category:", utxo.token.category);
  if (utxo.token.nft) {
    console.log("NFT capability:", utxo.token.nft.capability);
  }
}
```
