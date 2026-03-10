# MintCore

A minimal [CashTokens](https://cashtokens.org/) minting library for Bitcoin Cash, built on top of [@bitauth/libauth](https://github.com/bitauth/libauth).

## Features

- Mint fungible tokens (FT) and non-fungible tokens (NFT) on BCH
- Offline transaction building (no network required for genesis transactions)
- UTXO-funded transaction building via [Chronik](https://chronik.be.cash/) or ElectrumX / Fulcrum
- External wallet provider support (hardware wallets, browser extensions)
- BCMR (Bitcoin Cash Metadata Registry) OP_RETURN attachment
- Strict TypeScript types, ESM-native, zero runtime dependencies beyond libauth

## Installation

```bash
npm install mintcore
```

## v0.1.0 Developer Guide

### Import

```typescript
import {
  mintFungibleToken,
  createMetadata,
  AccountingAPI,
  createMaxSupplyRule,
} from "mintcore/api/mintcore.js";
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

### Utilities

| Export | Description |
|--------|-------------|
| `generateKey()` | Generate a cryptographically secure random private key (hex string) |
| `deriveAddress(privateKey, network)` | Derive a P2PKH CashAddress from a private key |
| `validateSchema(schema)` | Validate a `TokenSchema`; throws `MintCoreError` on failure |
| `estimateFee(inputs, outputs, feeRate, hasToken)` | Estimate transaction fee in satoshis |
| `selectUtxos(utxos, required, outputs, feeRate, hasToken)` | Greedy UTXO coin selection |
| `toHex(bytes)` / `fromHex(hex)` | Hex encoding/decoding helpers |
| `MintCoreError` | Error class thrown by all MintCore internals |
| `VERSION` | Current library version string |

### Types

`MintConfig`, `TokenSchema`, `NftOptions`, `TokenCapability`, `MintResult`, `Utxo`, `BuiltTransaction`, `WalletProvider`, `CoinSelectResult`

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

- [Versioning Policy](docs/VERSIONING.md)
- [Commit Conventions](docs/COMMITS.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Project Board](docs/PROJECT_BOARD.md)
- [Changelog](CHANGELOG.md)

## License

MIT
