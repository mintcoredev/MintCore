# Token Primitives

**Source:** `src/types/TokenPrimitives.ts`  
**Exported from:** `"mintcore"`

Core branded scalar types, token interfaces, type guards, and validation helpers for working with CashTokens fungible and non-fungible token values.

---

## Branded Scalar Types

### `TokenId`

```ts
type TokenId = string & { readonly __brand: "TokenId" };
```

A 64-character lowercase hex string that uniquely identifies a token output. This is the genesis transaction id expressed in internal (reversed) byte order, as used on-chain.

---

### `TokenCategory`

```ts
type TokenCategory = string & { readonly __brand: "TokenCategory" };
```

A 64-character lowercase hex string identifying a token category — the genesis transaction id used as the on-chain category identifier.

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
| `"none"` | Immutable NFT — commitment cannot be changed after minting |
| `"mutable"` | Commitment can be updated by the holder of this NFT |
| `"minting"` | Holder can mint additional NFTs of the same category |

---

## Token Interfaces

### `FungibleToken`

```ts
interface FungibleToken {
  /** Token category (genesis txid, 64-char lowercase hex). */
  category: TokenCategory;
  /** Non-negative token amount in the smallest unit. */
  amount: TokenAmount;
}
```

A fungible CashToken carrying an integer amount. The `category` links this token to the genesis transaction that created the token class.

---

### `NftData`

```ts
interface NftData {
  /** Minting capability of this NFT. */
  capability: NftCapability;
  /**
   * Up to 40 bytes of arbitrary commitment data encoded as a lowercase hex
   * string. Empty string means no commitment.
   */
  commitment: string;
}
```

The NFT data attached to a non-fungible token output.

---

### `NonFungibleToken`

```ts
interface NonFungibleToken {
  /** Token category (genesis txid, 64-char lowercase hex). */
  category: TokenCategory;
  /** NFT-specific data. */
  nft: NftData;
  /**
   * Optional fungible token amount co-located in the same output.
   * When absent the output carries no fungible balance.
   */
  amount?: TokenAmount;
}
```

A non-fungible CashToken. NFT outputs carry identity and capability information. They may also carry a co-located fungible token amount.

---

## Constructor / Coercion Functions

```ts
function toTokenId(value: string): TokenId
function toTokenCategory(value: string): TokenCategory
function toTokenAmount(value: bigint): TokenAmount
```

Cast and validate raw values to their branded types.

- `toTokenId` — validates that `value` is a 64-character lowercase hex string.
- `toTokenCategory` — same validation as `toTokenId`, with semantic intent for category use.
- `toTokenAmount` — validates that `value` is a non-negative bigint.

All three throw `MintCoreError` on invalid input.

---

## Type Guards

```ts
function isTokenId(value: unknown): value is TokenId
function isTokenCategory(value: unknown): value is TokenCategory
function isTokenAmount(value: unknown): value is TokenAmount
function isNftCapability(value: unknown): value is NftCapability
function isFungibleToken(value: unknown): value is FungibleToken
function isNonFungibleToken(value: unknown): value is NonFungibleToken
```

Return `true` when the input satisfies the corresponding type shape. Safe to call on untrusted `unknown` values.

---

## Assertion Helpers

```ts
function assertFungibleToken(value: unknown): asserts value is FungibleToken
function assertNonFungibleToken(value: unknown): asserts value is NonFungibleToken
```

Throw `MintCoreError` on the first constraint violation. Useful for validating external data at runtime.

---

## Examples

```ts
import {
  toTokenId,
  toTokenCategory,
  toTokenAmount,
  isNftCapability,
  isFungibleToken,
  assertFungibleToken,
  assertNonFungibleToken,
} from "mintcore";

// Cast a raw txid string to a branded TokenId
const id = toTokenId(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

// Cast to TokenCategory (same format, different semantic label)
const category = toTokenCategory(
  "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2"
);

// Non-negative fungible token amount as bigint
const amount = toTokenAmount(1_000_000n);

// Type guard
if (isNftCapability("minting")) {
  // narrowed to NftCapability
}

// Check an unknown value
const candidate = { category, amount };
if (isFungibleToken(candidate)) {
  console.log(candidate.amount); // TokenAmount
}

// Assertion — throws MintCoreError if the shape is wrong
assertFungibleToken({ category, amount });

// Assertion for NFT
assertNonFungibleToken({
  category,
  nft: { capability: "none", commitment: "deadbeef" },
});
```
