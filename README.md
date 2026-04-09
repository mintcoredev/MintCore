# MintCore SDK

A minimal, stable TypeScript SDK for building CashTokens-based asset systems on Bitcoin Cash, built on top of [@bitauth/libauth](https://github.com/bitauth/libauth).

**MintCore SDK is minimal. All advanced modules (pack-opening, covenants, UX, ARPG systems) live in separate repositories.**

MintCore handles the full lifecycle of creating CashTokens on BCH: building and signing genesis transactions, managing minting batons, estimating fees, and modelling pack/item/covenant data structures. It is pure TypeScript with no UI, no wallet integration, and no network client bundled in.

---

## Installation

```bash
npm install mintcore
```

Requires **Node.js 18+** (ESM).

---

## Quickstart

```ts
import { TransactionBuilder } from "mintcore";

// Build and sign a fungible token genesis transaction
const builder = new TransactionBuilder({
  network: "mainnet",
  privateKey: "your32byteprivatekeyhex",
  utxoProviderUrl: "https://chronik.be.cash/bch",
});

const result = await builder.build({
  name: "Gold",
  symbol: "GOLD",
  decimals: 2,
  initialSupply: 1_000_000n,
});

// result.hex  — signed transaction hex ready to broadcast
// result.txid — transaction id
await builder.broadcast(result.hex);
```

For a no-network example using only data modelling:

```ts
import { toTokenId, toTokenAmount, PackDefinition, serializePack, Rarity } from "mintcore";

// Create a branded TokenId
const id = toTokenId("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2");

// Define a pack (data-only, no RNG or opening logic)
const pack: PackDefinition = {
  id: "starter-pack-v1",
  version: 1,
  metadata: { name: "Starter Pack" },
  items: [{ id: "iron-sword", version: 1, rarity: Rarity.Common, metadata: { name: "Iron Sword" } }],
};
console.log(serializePack(pack));
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Installation, basic usage, minimal examples |
| [Token Primitives](docs/core/token-primitives.md) | Branded types, type guards, coercion helpers |
| [UTXO Models](docs/core/utxo-models.md) | `BaseUtxo`, `TokenUtxo`, assertion helpers |
| [Transaction Builder](docs/core/transaction-builder.md) | Building and signing genesis transactions |
| [Packs](docs/assets/packs.md) | `PackDefinition`, `PackMetadata` |
| [Items](docs/assets/items.md) | `ItemDefinition`, `ItemMetadata` |
| [Rarity](docs/assets/rarity.md) | `Rarity` enum and helpers |
| [Covenant Interfaces](docs/covenants/covenant-interfaces.md) | `CovenantDefinition` and constraints |
| [Covenant Builder](docs/covenants/covenant-builder.md) | Abstract `CovenantBuilder` class |
| [Covenant Utils](docs/covenants/covenant-utils.md) | Hashing and metadata encoding |
| [JSON Helpers](docs/serialization/json-helpers.md) | Deterministic pack/item serialization |
| [Versioning](docs/VERSIONING.md) | SemVer rules, breaking change policy |

---

## Examples

Self-contained TypeScript examples under [`/examples`](examples/):

| Example | Demonstrates |
|---------|-------------|
| [`create-token/`](examples/create-token/) | `TokenId`, `TokenUtxo`, metadata schema v1 |
| [`define-pack/`](examples/define-pack/) | `PackDefinition`, `Rarity`, JSON serialization |
| [`covenant-structure/`](examples/covenant-structure/) | `CovenantBuilder`, hashing, metadata encoding |

---

## What MintCore Does

### Token Minting

MintCore mints both fungible tokens (FTs) and non-fungible tokens (NFTs) using the CashTokens protocol. It constructs the raw BCH genesis transaction, attaches the token prefix, signs the inputs, and returns the serialised hex ready to broadcast.

**Single mint** — use `MintEngine` directly or the convenience wrappers:

```ts
import { mintFungibleToken, mintNFT } from "mintcore";

// Mint 1 000 000 fungible tokens
const result = await mintFungibleToken(
  {
    network: "mainnet",
    privateKey: "your32byteprivatekeyhex",
    utxoProviderUrl: "https://chronik.be.cash/bch",
  },
  {
    name: "Gold",
    symbol: "GOLD",
    decimals: 2,
    initialSupply: 1_000_000n,
    bcmrUri: "ipfs://bafybei...", // optional BCMR metadata URI
  }
);
// result.hex  — signed transaction hex
// result.txid — transaction id

// Mint an NFT with a minting baton
const nft = await mintNFT(
  { network: "mainnet", privateKey: "...", utxoProviderUrl: "..." },
  {
    name: "Sword of Dawn",
    symbol: "SWORD",
    decimals: 0,
    initialSupply: 1n,
    nft: { capability: "minting", commitment: "0x1a2b" },
  }
);
```

**Batch mint** — use `BatchMintEngine` to plan and execute many token outputs across one or more transactions:

```ts
import { BatchMintEngine } from "mintcore";

const engine = new BatchMintEngine({
  network: "mainnet",
  privateKey: "...",
  utxoProviderUrl: "https://chronik.be.cash/bch",
});

const plan = await engine.planMintBatch(
  [
    { capability: "none", amount: 500n },
    { capability: "none", amount: 500n },
    { capability: "minting", amount: 0n, commitment: "01" }, // baton
  ],
  { maxOutputsPerTx: 20, feeSafetyMarginPercent: 10 }
);

// Inspect cost before broadcasting
console.log(plan.totalTransactions, plan.totalEstimatedFee);

const execution = await engine.executeMintBatch(plan);
// execution.txids          — broadcast txids
// execution.mintResults    — per-request mapping to txid + outputIndex
// execution.totalFeePaid
```

### Token Schema

Define a token with `TokenSchema`:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Human-readable token name |
| `symbol` | `string` | Ticker symbol |
| `decimals` | `number` | Decimal places (0–18) |
| `initialSupply` | `bigint` | Number of fungible units to mint |
| `nft` | `NftOptions` | Optional — adds NFT capability and commitment |
| `metadata` | `object` | Optional — arbitrary key/value metadata (max 1 000 chars) |
| `bcmrUri` | `string` | Optional — IPFS CID or URL to a BCMR JSON file attached as OP\_RETURN |
| `bcmrHash` | `string` | Optional — 64-hex-char SHA-256 hash of the BCMR document; when set with `bcmrUri`, emits `OP_RETURN BCMR <hash> <uri>` (hash-pinned authchain) |

NFT capabilities follow the CashTokens spec: `"none"` (immutable NFT), `"mutable"` (commitment can be updated), `"minting"` (holder can mint more).

### BCMR Metadata

Generate a [CHIP-BCMR v2](https://github.com/bitjson/chip-bcmr) document and embed its content hash in the genesis transaction for a hash-pinned authchain registration:

```ts
import { generateBcmr, hashBcmr, mintFungibleToken } from "mintcore";

const doc = generateBcmr({
  category: "abcd...0001", // 64-char hex genesis txid
  name: "My Token",
  symbol: "MTK",
  decimals: 8,
  uris: { icon: "ipfs://bafybei...", web: "https://mytoken.example" },
});

// Host `JSON.stringify(doc)` at your bcmrUri, then compute its hash:
const hash = hashBcmr(doc); // 64-char hex SHA-256

const result = await mintFungibleToken(config, {
  name: "My Token",
  symbol: "MTK",
  decimals: 8,
  initialSupply: 21_000_000n,
  bcmrUri: "https://mytoken.example/bcmr.json",
  bcmrHash: hash, // → OP_RETURN BCMR <hash> <uri>
});
```

### Configuration

`MintConfig` controls how transactions are built and signed:

| Field | Type | Description |
|-------|------|-------------|
| `network` | `"mainnet" \| "testnet" \| "regtest"` | BCH network |
| `privateKey` | `string` | 32-byte private key as hex — used to derive the address and sign inputs |
| `utxoProviderUrl` | `string` | Chronik node URL used to fetch UTXOs and broadcast transactions |
| `electrumxProviderUrl` | `string` | ElectrumX / Fulcrum HTTP REST URL — fallback when Chronik is not configured |
| `feeRate` | `number` | sat/byte fee rate (default: 1.0) |

When both provider URLs are set, Chronik (`utxoProviderUrl`) takes precedence.

### Script Primitives

Low-level locking-bytecode builders for composing BCH scripts:

```ts
import { p2pkhLockingBytecode, burnLockingBytecode, opReturnLockingBytecode } from "mintcore";

// P2PKH locking script from a 20-byte public-key hash
const lock = p2pkhLockingBytecode(pkh);

// Provably unspendable OP_RETURN output (burn)
const burn = burnLockingBytecode(optionalData);

// OP_RETURN data-carrier output (e.g. for BCMR metadata)
const opReturn = opReturnLockingBytecode(chunk1, chunk2);
```

P2SH helpers (`p2shLockingBytecode`, `p2shRedeemBytecode`) and raw opcode constants are also exported.

### Utilities

| Export | Purpose |
|--------|---------|
| `estimateFee(inputs, outputs, feeRate, hasToken)` | Estimate fee in satoshis for a single mint transaction |
| `estimateBatchTxFee(...)` | Estimate fee for a batch-minting transaction |
| `selectUtxos(utxos, target)` | Greedy coin selection for funding inputs |
| `validateSchema(schema)` | Throw on invalid `TokenSchema` fields |
| `validateMintRequest(req)` | Throw on invalid `MintRequest` fields |
| `toHex(bytes)` / `fromHex(hex)` | `Uint8Array` ↔ hex string conversion |
| `categoryFromTxid(txid)` | Convert display-order txid to internal category bytes |
| `categoryToHex(category)` | Convert internal category bytes to display-order hex |
| `createMetadata(fields)` | Build a metadata object |
| `encodeMetadata(metadata)` | Serialise metadata to a JSON string |
| `createBatonRequest(overrides?)` | Build a `MintRequest` for a minting-baton output |
| `isBatonRequest(req)` | Return `true` when a request carries a minting baton |
| `generateBcmr(options)` | Build a spec-compliant [CHIP-BCMR v2](https://github.com/bitjson/chip-bcmr) JSON document from token identity inputs |
| `hashBcmr(doc)` | Compute the SHA-256 content hash of a BCMR document; returns a 64-char hex string suitable for use as `TokenSchema.bcmrHash` |

### Fee Estimation Constants

```ts
import {
  P2PKH_INPUT_SIZE,   // 148 bytes
  P2PKH_OUTPUT_SIZE,  // 34 bytes
  TOKEN_PREFIX_OVERHEAD, // 50 bytes
  TOKEN_OUTPUT_DUST,  // 1 000 satoshis
  DUST_THRESHOLD,     // 546 satoshis
  DEFAULT_FEE_RATE,   // 1.0 sat/byte
} from "mintcore";
```

---

## What MintCore Does Not Include

- Wallet connectivity — no WalletConnect, browser extensions, or hardware wallet support
- UI components — no React, Vue, or any framework code
- A bundled network client — bring your own Chronik or ElectrumX URL
- Key management beyond raw 32-byte private key signing
- On-chain querying beyond UTXO fetching for fee funding
- Pack-opening logic, RNG, or probability weighting
- Covenant enforcement or script generation
- Game mechanics or ARPG systems

**All advanced modules live in separate repositories built on top of MintCore.**
