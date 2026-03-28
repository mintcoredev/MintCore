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
├── src/utils/         Utility functions (hex, keys, fees, validation)
├── src/wallet/        BCH wallet engine (no UI, no React)
└── src/ui/            React UI layer — WalletProvider, useWallet, ConnectWalletButton
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

## Wallet Engine

MintCore includes a BCH wallet engine for wallet integration, preparing for
WalletConnect v2.

- **BCH-native** — built exclusively for Bitcoin Cash; no EVM chain IDs, multi-chain
  abstractions, or WalletConnect session topics.
- **UI-agnostic** — the engine contains no modal, dialog, or visual component of any
  kind. Consumers supply their own pairing UI if one is required.
- **Modular adapters** — the `WalletAdapter` interface and `WalletRegistry` allow any
  BCH wallet to be plugged in without modifying the core engine.
- **Stable TypeScript API** — `WalletManager` exposes a typed interface for connecting,
  disconnecting, and signing transactions. Types are exported from the top-level package
  entry point.

```
src/wallet/
├── WalletTypes.ts          Enumerations, constants, and interfaces
├── WalletClient.ts         Low-level BCH wallet adapter
├── WalletManager.ts        High-level lifecycle orchestrator
├── registry.ts             WalletRegistry and createWalletRegistry factory
├── adapters/
│   ├── WalletAdapter.ts    Unified adapter interface
│   ├── BchWalletAdapter.ts BCH-specific adapter interface
│   └── BaseWalletAdapter.ts Base implementation of WalletAdapter
└── index.ts                Public re-export barrel
```

See [Wallet Engine Architecture](wallet/architecture.md) and the
[Wallet API Reference](api/wallet.md) for full details.

## React UI Layer (`@mintcore/ui`)

A separate package, `@mintcore/ui`, provides ready-made React components and hooks for
integrating the wallet engine into React applications.

```
src/ui/
├── wallet/
│   ├── WalletAdapter.ts    Re-export of the SDK WalletAdapter interface
│   ├── WalletContext.ts    React context types
│   ├── WalletProvider.tsx  Context provider and connection logic
│   ├── useWallet.ts        Primary React hook
│   └── adapters/
│       └── BaseWalletAdapter.ts  Re-export of BaseWalletAdapter from the SDK
└── components/
    └── ConnectWalletButton.tsx  Connect/disconnect button component
```

See [UI Layer](ui.md) for full details.

## Further Reading

- [Wallet Engine Architecture](wallet/architecture.md) — component responsibilities and engine-only constraints
- [Wallet API Reference](api/wallet.md) — public API and type definitions
- [Wallet Engine Versioning](versioning/wallet-engine.md) — migration notes for v0.3.0
- [UI Layer (`@mintcore/ui`)](ui.md) — React provider, hook, and components
- [Future Modules](future-modules.md) — planned extensions and upcoming features
- [Versioning Policy](VERSIONING.md) — how releases are versioned
- [Commit Conventions](COMMITS.md) — commit message standard
- [Contributing Guide](../CONTRIBUTING.md) — how to contribute
