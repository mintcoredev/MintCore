# API Reference — Token Primitives (`src/types/TokenPrimitives.ts`)

Core branded scalar types and token interfaces for CashTokens.

---

## Type Definitions

### `TokenId`

```ts
type TokenId = string & { readonly __brand: "TokenId" };
```

A 64-character lowercase hex string that uniquely identifies a token output (the genesis transaction id in internal byte order).

---

### `TokenCategory`

```ts
type TokenCategory = string & { readonly __brand: "TokenCategory" };
```

A 64-character lowercase hex string that identifies a token category (the genesis transaction id used as the on-chain category identifier).

---

### `TokenAmount`

```ts
type TokenAmount = bigint & { readonly __brand: "TokenAmount" };
```

A non-negative `bigint` representing a fungible token amount expressed in the smallest indivisible unit of the token.

---

### `NftCapability`

```ts
type NftCapability = "none" | "mutable" | "minting";
```

The three NFT minting capabilities defined by the CashTokens specification.

| Value | Description |
|-------|-------------|
| `"none"` | Immutable NFT — commitment cannot be changed |
| `"mutable"` | Commitment can be updated by the holder |
| `"minting"` | Holder can mint additional NFTs of the same category |

---

### `FungibleToken`

```ts
interface FungibleToken {
  category: TokenCategory;
  amount: TokenAmount;
}
```

A fungible CashToken carrying an integer amount. The `category` links this token to the genesis transaction that created the token class.

---

### `NftData`

```ts
interface NftData {
  capability: NftCapability;
  commitment: string; // up to 40 bytes as lowercase hex
}
```

The NFT data attached to a non-fungible token output.

---

### `NonFungibleToken`

```ts
interface NonFungibleToken {
  category: TokenCategory;
  nft: NftData;
  amount?: TokenAmount; // optional co-located FT balance
}
```

A non-fungible CashToken. May optionally carry a co-located fungible token amount in the same output.

---

## Function Signatures

### Constructor / coercion functions

```ts
function toTokenId(value: string): TokenId
function toTokenCategory(value: string): TokenCategory
function toTokenAmount(value: bigint): TokenAmount
```

Cast and validate raw values to their branded types. Throw `MintCoreError` on invalid input.

### Type guards

```ts
function isTokenId(value: unknown): value is TokenId
function isTokenCategory(value: unknown): value is TokenCategory
function isTokenAmount(value: unknown): value is TokenAmount
function isNftCapability(value: unknown): value is NftCapability
function isFungibleToken(value: unknown): value is FungibleToken
function isNonFungibleToken(value: unknown): value is NonFungibleToken
```

### Assertion helpers

```ts
function assertFungibleToken(value: unknown): asserts value is FungibleToken
function assertNonFungibleToken(value: unknown): asserts value is NonFungibleToken
```

Throw `MintCoreError` on the first constraint violation.

---

## Usage Examples

```ts
import {
  toTokenId,
  toTokenCategory,
  toTokenAmount,
  isNftCapability,
  assertFungibleToken,
} from "mintcore";

// Cast a raw txid to a branded TokenId
const id = toTokenId("a1b2c3d4..."); // 64-char hex string

// Validate a fungible token amount
const amount = toTokenAmount(1_000_000n);

// Type guard usage
if (isNftCapability("minting")) {
  // narrowed to NftCapability
}

// Assertion — throws MintCoreError if invalid
assertFungibleToken({ category: id, amount });
```
