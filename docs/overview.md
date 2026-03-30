# MintCore Overview

MintCore is a minimal [CashTokens](https://cashtokens.org/) minting SDK for Bitcoin Cash,
built on top of [@bitauth/libauth](https://github.com/bitauth/libauth).

## Purpose

MintCore provides a simple, type-safe API for creating fungible tokens (FT) and
non-fungible tokens (NFT) on the Bitcoin Cash network. It is designed to be:

- **Minimal** — zero runtime dependencies beyond libauth
- **Offline-capable** — genesis transactions can be built without a network connection
- **Composable** — UTXO provider URLs are swappable — bring your own Chronik or ElectrumX endpoint
- **TypeScript-native** — strict types and ESM-native module format

## Scope

MintCore is a pure minting SDK. It intentionally does **not** include:

- Wallet connectivity — no WalletConnect, browser extension integration, or hardware wallet support
- UI components — no React, Vue, or any framework code
- A bundled network client — bring your own Chronik or ElectrumX URL
- Key management beyond raw 32-byte private key signing
- On-chain querying beyond UTXO fetching for fee funding

Wallet connectivity and UI belong in the application layer built on top of MintCore.

## Architecture

```
MintCore
├── src/core/          Core minting engine and transaction builder
├── src/adapters/      Adapters bridging engine and libauth
├── src/cashTokens/    CashTokens helpers (baton, category, metadata, mint)
├── src/scripts/       Locking-bytecode builders (P2PKH, P2SH, OP_RETURN, burn)
├── src/transactions/  Transaction builders (mint, baton, send)
├── src/types/         Shared TypeScript type definitions
└── src/utils/         Utility functions (hex, keys, fees, validation)
```

## Key Concepts

### MintEngine

The `MintEngine` is the central orchestrator. It accepts a `MintConfig` and delegates
transaction construction to `TransactionBuilder` via `LibauthAdapter`.

### TransactionBuilder

Responsible for assembling and signing CashTokens genesis transactions according to the
[CashTokens specification](https://cashtokens.org/docs/spec/chip).

### Providers

Two built-in UTXO providers fetch UTXOs and broadcast signed transactions to the network:

- **ChronikProvider** — connects to a [Chronik](https://chronik.be.cash/) indexer
- **ElectrumXProvider** — connects to an ElectrumX / Fulcrum server

Provider logic is internal to the SDK; consumers supply only the URL via `MintConfig`.

## Further Reading

- [Batch Minting](batch-minting.md) — planning and executing large mint batches
- [Future Modules](future-modules.md) — planned extensions and upcoming features
- [Versioning Policy](VERSIONING.md) — how releases are versioned
- [Commit Conventions](COMMITS.md) — commit message standard
- [Contributing Guide](../CONTRIBUTING.md) — how to contribute
