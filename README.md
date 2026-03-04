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
| `validateSchema(schema)` | Validate a `TokenSchema`; throws `MintCoreError` on failure |
| `estimateFee(inputs, outputs, feeRate, hasToken)` | Estimate transaction fee in satoshis |
| `selectUtxos(utxos, required, outputs, feeRate, hasToken)` | Greedy UTXO coin selection |
| `toHex(bytes)` / `fromHex(hex)` | Hex encoding/decoding helpers |
| `MintCoreError` | Error class thrown by all MintCore internals |
| `VERSION` | Current library version string |

### Types

`MintConfig`, `TokenSchema`, `NftOptions`, `TokenCapability`, `MintResult`, `Utxo`, `BuiltTransaction`, `WalletProvider`, `CoinSelectResult`

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
