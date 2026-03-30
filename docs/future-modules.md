# Future Modules

This document tracks planned extensions and upcoming features for MintCore.

> **Scope note:** Wallet connectivity, hardware wallets, browser extension integration,
> and UI components are intentionally out of scope for MintCore. This SDK is a pure
> minting engine; those concerns belong in the application layer built on top of it.

## Planned

### Browser Extension Provider

A provider implementation that delegates signing to browser extension wallets
(e.g., Cashonize, Paytaca) using the standard BCH wallet API.

### Token Burn Helpers

Utility functions for constructing token-burn transactions, including partial burns and
full category retirement.

### Expanded Validation

Additional schema validators covering BCMR metadata constraints, NFT commitment length
limits, and supply cap checks.

## Under Consideration

- **CLI tooling** — a standalone command-line interface for scripted minting workflows
- **Regtest utilities** — helpers for spinning up local regtest environments for testing

## Completed

- **Batch Minting** — `BatchMintEngine` shipped in v1.1.0. Plans and executes large
  batches of token mint operations across multiple transactions, with greedy UTXO
  selection, fee estimation, and UTXO locking. See [docs/batch-minting.md](batch-minting.md).
- **BCMR Metadata Generator** — `generateBcmr()` and `hashBcmr()` shipped. Build
  spec-compliant [CHIP-BCMR v2](https://github.com/bitjson/chip-bcmr) documents from
  token identity inputs and embed SHA-256 content hashes in genesis transactions for
  hash-pinned authchain registrations via `TokenSchema.bcmrHash`.

See [CHANGELOG](../CHANGELOG.md) for a full history of shipped features.
