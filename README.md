# MintCore

A CashTokens minting engine for Bitcoin Cash, built on top of [@bitauth/libauth](https://github.com/bitauth/libauth).

MintCore handles the full lifecycle of creating and tracking CashTokens on BCH: building and signing genesis transactions, managing minting batons, estimating fees, enforcing mint rules, and maintaining an in-memory ledger of balances and supply. It is pure TypeScript with no UI, no wallet, and no network client bundled in.

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

NFT capabilities follow the CashTokens spec: `"none"` (immutable NFT), `"mutable"` (commitment can be updated), `"minting"` (holder can mint more).

### Configuration

`MintConfig` controls how transactions are built and signed:

| Field | Type | Description |
|-------|------|-------------|
| `network` | `"mainnet" \| "testnet" \| "regtest"` | BCH network |
| `privateKey` | `string` | 32-byte private key as hex — used to derive the address and sign inputs |
| `walletProvider` | `WalletProvider` | External signer (hardware wallet, browser extension, etc.) — alternative to `privateKey` |
| `utxoProviderUrl` | `string` | Chronik node URL used to fetch UTXOs and broadcast transactions |
| `electrumxProviderUrl` | `string` | ElectrumX / Fulcrum HTTP REST URL — fallback when Chronik is not configured |
| `feeRate` | `number` | sat/byte fee rate (default: 1.0) |

When both `privateKey` and `walletProvider` are set, `privateKey` takes precedence. When both provider URLs are set, Chronik (`utxoProviderUrl`) takes precedence.

### External Wallet Provider

Implement `WalletProvider` to plug in any signing back-end without exposing a raw private key:

```ts
import type { WalletProvider } from "mintcore";

class MyHardwareWallet implements WalletProvider {
  async getAddress(): Promise<string> { /* ... */ }
  async signTransaction(
    txHex: string,
    sourceOutputs: ReadonlyArray<{ satoshis: bigint; lockingBytecode: Uint8Array }>
  ): Promise<string> { /* ... */ }
}
```

### Accounting

`AccountingAPI` is an in-memory ledger that tracks token supply and per-address balances across mint, transfer, burn, and adjustment operations.

```ts
import { AccountingAPI } from "mintcore";

const ledger = new AccountingAPI();

ledger.mint("GOLD", "alice", 1000n);
ledger.transfer("GOLD", "alice", "bob", 250n);
ledger.burn("GOLD", "bob", 50n);

ledger.getBalance("alice", "GOLD"); // 750n
ledger.getSupply("GOLD");           // 950n
ledger.getOwners("GOLD");           // ["alice", "bob"]
ledger.getEvents();                 // full ordered event log
```

### Mint Rules

Attach rules to `AccountingAPI` to enforce minting constraints. Rules are checked before any `mint` or `transfer` operation:

```ts
import { AccountingAPI, createMaxSupplyRule, createMintAuthorityRule } from "mintcore";

const ledger = new AccountingAPI();

ledger.addRule(createMaxSupplyRule("GOLD", 10_000n));
ledger.addRule(createMintAuthorityRule("GOLD", ["treasury"]));
```

Available rule factories:

| Factory | Effect |
|---------|--------|
| `createMaxSupplyRule(asset, max)` | Prevents minting beyond a hard supply cap |
| `createMintAuthorityRule(asset, addresses)` | Restricts minting to an allowlist of addresses |
| `createSoulboundRule(asset)` | Marks an asset as non-transferable |
| `createCooldownRule(asset, ms)` | Enforces a minimum time between operations |
| `createRoyaltyRule(asset, basisPoints, recipient)` | Defines a royalty percentage on transfers |
| `createXpThresholdRule(asset, minXp)` | Requires a minimum XP balance to receive the asset |
| `createQuestRewardRule(asset, questId, amount)` | Ties a reward amount to a specific quest |

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

## Installation

```bash
npm install mintcore
```

Requires Node.js 18+ (ESM).

## What MintCore Does Not Include

- Wallet UI or browser extension integration
- React / Vue / any UI framework components
- A bundled network client — bring your own Chronik or ElectrumX URL
- Key management or seed-phrase derivation beyond raw 32-byte private keys
