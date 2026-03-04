# Future Modules

This document tracks planned extensions and upcoming features for MintCore.

## Planned

### Multi-Mint Batching

Support for building a single transaction that mints multiple token categories in one
operation, reducing on-chain footprint for bulk issuances.

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

See [CHANGELOG](../CHANGELOG.md) for a full history of shipped features.
