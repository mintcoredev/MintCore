# Future Modules

This document tracks planned extensions and upcoming features for MintCore.

## Planned

### BCMR Publishing Module

A dedicated module for constructing and broadcasting
[Bitcoin Cash Metadata Registry (BCMR)](https://github.com/bitjson/chip-bcmr) OP_RETURN
outputs, with helpers for URI encoding and registry hash pinning.

### Hardware Wallet Provider

A `WalletProvider` implementation that integrates with hardware signing devices
(e.g., Ledger) via standard transport libraries.

### Browser Extension Provider

A `WalletProvider` implementation that delegates signing to browser extension wallets
(e.g., Cashonize, Paytaca) using the standard BCH wallet API.

### Token Burn Helpers

Utility functions for constructing token-burn transactions, including partial burns and
full category retirement.

### Expanded Validation

Additional schema validators covering BCMR metadata constraints, NFT commitment length
limits, and supply cap checks.

## Under Consideration

- **CLI tooling** — a standalone command-line interface for scripted minting workflows
- **React / framework hooks** — lightweight wrappers for front-end integration
- **Regtest utilities** — helpers for spinning up local regtest environments for testing

## Completed

- **Batch Minting** — `BatchMintEngine` shipped in v1.1.0. Plans and executes large
  batches of token mint operations across multiple transactions, with greedy UTXO
  selection, fee estimation, and UTXO locking. See [docs/batch-minting.md](batch-minting.md).
- **WalletConnect v2 Engine** — `WalletManager` shipped in v1.2.0. Connects BCH wallets
  (Paytaca, Cashonize, Zapit) via WalletConnect v2 without requiring a private key.
  See [docs/wallet/architecture.md](wallet/architecture.md).

See [CHANGELOG](../CHANGELOG.md) for a full history of shipped features.
