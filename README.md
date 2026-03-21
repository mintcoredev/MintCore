# MintCore

A minimal [CashTokens](https://cashtokens.org/) minting library for Bitcoin Cash, built on top of [@bitauth/libauth](https://github.com/bitauth/libauth).

## Features

- Mint fungible tokens (FT) and non-fungible tokens (NFT) on BCH
- **Batch minting** — plan and execute large-scale mint operations across multiple optimised transactions using `BatchMintEngine`
- **WalletConnect v2** — connect BCH wallets (Paytaca, Cashonize, Zapit) without exposing a private key
- **On-chain accounting** — in-memory ledger with `AccountingAPI`: mint, transfer, burn, reward, fee collection, and balance queries
- Offline transaction building (no network required for genesis transactions)
- UTXO-funded transaction building via [Chronik](https://chronik.be.cash/) or ElectrumX / Fulcrum
- External wallet provider support (hardware wallets, browser extensions)
- BCMR (Bitcoin Cash Metadata Registry) OP_RETURN attachment
- Strict TypeScript types, ESM-native, zero runtime dependencies beyond libauth

## Installation

```bash
npm install mintcore
```

## Developer Guide

### Import

```typescript
import {
  mintFungibleToken,
  createMetadata,
  AccountingAPI,
  createMaxSupplyRule,
} from "mintcore";
```

### Mint

```typescript
const result = await mintFungibleToken(
  { network: "mainnet", privateKey: "<32-byte hex key>" },
  { name: "My Token", symbol: "MTK", decimals: 2, initialSupply: 1_000_000n }
);
console.log(result.txid);
```

### Transfer

```typescript
const api = new AccountingAPI();
api.mint("GOLD", "alice", 100n);
api.transfer("GOLD", "alice", "bob", 40n);
```

### Get Balance

```typescript
const api = new AccountingAPI();
api.mint("GOLD", "alice", 100n);
const balance = api.getBalance("alice", "GOLD"); // 100n
```

---

## Quick Start

```typescript
import { mintFungibleToken, mintNFT } from "mintcore";

// Mint a fungible token (offline, no UTXOs required)
const result = await mintFungibleToken(
  { network: "mainnet", privateKey: "<32-byte hex key>" },
  { name: "My Token", symbol: "MTK", decimals: 2, initialSupply: 1_000_000n }
);
console.log(result.txid); // 64-char hex transaction ID
console.log(result.hex);  // signed raw transaction hex

// Mint an NFT
const nftResult = await mintNFT(
  { network: "mainnet", privateKey: "<32-byte hex key>" },
  {
    name: "My NFT",
    symbol: "MNFT",
    decimals: 0,
    initialSupply: 0n,
    nft: { capability: "minting", commitment: "deadbeef" },
  }
);
```

## API Reference

### Core

| Export | Description |
|--------|-------------|
| `MintEngine` | Low-level minting engine; wraps `TransactionBuilder` |
| `TransactionBuilder` | Builds and signs genesis transactions |
| `LibauthAdapter` | Adapter between `MintEngine` and `TransactionBuilder` |
| `BatchMintEngine` | Plans and executes large-scale batch mint operations |

### Convenience functions

| Export | Description |
|--------|-------------|
| `mintFungibleToken(config, schema)` | One-call FT minting |
| `mintNFT(config, schema)` | One-call NFT minting |
| `verifyMint(config, txid)` | Validate a mint txid format |
| `createMetadata(fields)` | Create a metadata record |
| `encodeMetadata(metadata)` | JSON-encode metadata |

### Providers

| Export | Description |
|--------|-------------|
| `ChronikProvider` | Fetch UTXOs and broadcast via a Chronik instance |
| `ElectrumXProvider` | Fetch UTXOs and broadcast via ElectrumX / Fulcrum |
| `WalletConnectProvider` | Sign transactions via a WalletConnect v2 session |

### Wallet Engine

| Export | Description |
|--------|-------------|
| `WalletManager` | High-level lifecycle orchestrator; manages connect/disconnect/sign |
| `WalletClient` | Low-level WalletConnect v2 adapter |
| `WalletType` | Enum of supported BCH wallet applications (Paytaca, Cashonize, Zapit) |
| `WalletConnectionState` | Enum of connection lifecycle states |
| `BCH_CHAIN_IDS` | CAIP-2 chain identifiers for mainnet / testnet / regtest |

### Accounting

| Export | Description |
|--------|-------------|
| `AccountingAPI` | In-memory ledger: `mint`, `transfer`, `burn`, `reward`, `collectFee`, `adjust`, balance/supply/holder queries |
| `AdjustmentService` | Low-level credit/debit adjustments with direction control |
| `createMaxSupplyRule` | Rule: cap the total token supply |
| `createMintAuthorityRule` | Rule: restrict minting to a named authority |
| `createSoulboundRule` | Rule: prevent token transfers (soulbound) |
| `createCooldownRule` | Rule: enforce a minimum time between operations |
| `createRoyaltyRule` | Rule: route a percentage of each transfer to a recipient |
| `createXpThresholdRule` | Rule: require a minimum XP balance to perform an operation |
| `createQuestRewardRule` | Rule: issue a fixed reward when a quest is completed |

### Utilities

| Export | Description |
|--------|-------------|
| `generateKey()` | Generate a cryptographically secure random private key (hex string) |
| `deriveAddress(privateKey, network)` | Derive a P2PKH CashAddress from a private key |
| `validateSchema(schema)` | Validate a `TokenSchema`; throws `MintCoreError` on failure |
| `validateMintRequest(req)` | Validate a single `MintRequest`; throws `MintCoreError` on failure |
| `validateBatchMintOptions(opts)` | Validate `BatchMintOptions`; throws `MintCoreError` on failure |
| `estimateFee(inputs, outputs, feeRate, hasToken)` | Estimate transaction fee in satoshis |
| `estimateBatchTxFee(inputs, tokenOutputs, changeOutputs, feeRate, margin, baton)` | Estimate fee for a batch-mint transaction |
| `estimateBatchTxSize(inputs, tokenOutputs, changeOutputs, baton)` | Estimate serialised size of a batch-mint transaction |
| `selectUtxos(utxos, required, outputs, feeRate, hasToken)` | Greedy UTXO coin selection |
| `toHex(bytes)` / `fromHex(hex)` | Hex encoding/decoding helpers |
| `MintCoreError` | Error class thrown by all MintCore internals |
| `VERSION` | Current library version string |
| `TOKEN_OUTPUT_DUST` | Minimum satoshis for a token-bearing output (1000) |
| `DUST_THRESHOLD` | Minimum change-output value to avoid dust (546) |
| `DEFAULT_FEE_RATE` | Default fee rate in sat/byte (1.0) |

### Types

`MintConfig`, `TokenSchema`, `NftOptions`, `TokenCapability`, `MintResult`, `Utxo`, `BuiltTransaction`, `WalletProvider`, `CoinSelectResult`, `MintRequest`, `BatchMintOptions`, `BatchMintPlan`, `PlannedTransaction`, `MintExecutionResult`, `WalletConnectClientLike`, `WalletConnectProviderOptions`, `WalletSession`, `WalletEventName`, `WalletEventPayload`, `AdjustmentParams`, `AdjustmentDirection`

## Key Generation

`generateKey` and `deriveAddress` let you create a new wallet identity (private key + address) without any external dependencies.

```typescript
import { generateKey, deriveAddress } from "mintcore";

// Generate a new random private key
const privateKey = generateKey();
// e.g. "3b4c8f2a..." (64-character hex string)

// Derive the corresponding CashAddress
const address = deriveAddress(privateKey, "mainnet");
// e.g. "bitcoincash:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd"

// Use the key immediately for minting
const result = await mintFungibleToken(
  { network: "mainnet", privateKey },
  { name: "My Token", symbol: "MTK", decimals: 2, initialSupply: 1_000_000n }
);
```

## MintConfig

```typescript
interface MintConfig {
  network: "mainnet" | "testnet" | "regtest";
  privateKey?: string;          // 32-byte hex; required unless walletProvider is set
  walletProvider?: WalletProvider;
  utxoProviderUrl?: string;     // Chronik base URL
  electrumxProviderUrl?: string; // ElectrumX / Fulcrum base URL
  feeRate?: number;             // sat/byte, default 1.0
}
```

## Development

```bash
npm install
npm run build   # compile TypeScript
npm test        # run Vitest test suite
```

## Documentation

- [Overview & Architecture](docs/overview.md)
- [Batch Minting](docs/batch-minting.md)
- [Wallet Engine Architecture](docs/wallet/architecture.md)
- [Wallet API Reference](docs/api/wallet.md)
- [Wallet Engine Versioning](docs/versioning/wallet-engine.md)
- [Versioning Policy](docs/VERSIONING.md)
- [Commit Conventions](docs/COMMITS.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Project Board](docs/PROJECT_BOARD.md)
- [Changelog](CHANGELOG.md)

## License

MIT
