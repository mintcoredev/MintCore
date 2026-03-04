# MintCore Overview

MintCore is a minimal [CashTokens](https://cashtokens.org/) minting library for Bitcoin Cash,
built on top of [@bitauth/libauth](https://github.com/bitauth/libauth).

## Purpose

MintCore provides a simple, type-safe API for creating fungible tokens (FT) and
non-fungible tokens (NFT) on the Bitcoin Cash network. It is designed to be:

- **Minimal** — zero runtime dependencies beyond libauth
- **Offline-capable** — genesis transactions can be built without a network connection
- **Composable** — UTXO providers and wallet providers are swappable interfaces
- **TypeScript-native** — strict types and ESM-native module format

## Architecture

```
MintCore
├── src/core/          Core minting engine and transaction builder
├── src/adapters/      Adapters bridging engine and libauth
├── src/providers/     UTXO and broadcast providers (Chronik, ElectrumX)
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

Providers implement the `WalletProvider` interface to supply UTXOs and broadcast signed
transactions to the network. Two built-in providers are included:

- **ChronikProvider** — connects to a [Chronik](https://chronik.be.cash/) indexer
- **ElectrumXProvider** — connects to an ElectrumX / Fulcrum server

## Further Reading

- [Future Modules](future-modules.md) — planned extensions and upcoming features
- [Versioning Policy](VERSIONING.md) — how releases are versioned
- [Commit Conventions](COMMITS.md) — commit message standard
- [Contributing Guide](../CONTRIBUTING.md) — how to contribute
