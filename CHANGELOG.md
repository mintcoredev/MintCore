# Changelog

All notable changes to MintCore are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this
project adheres to [Semantic Versioning](docs/VERSIONING.md).

---

## [Unreleased]

> All changes are internal hardening only; the public MintCore API and transaction formats are unchanged.

### Added

- `generateKey()` — generates a cryptographically secure random 32-byte private key as a hex string.
- `deriveAddress(privateKey, network)` — derives a P2PKH CashAddress from a private key for mainnet, testnet, or regtest.

### Changed

### Fixed

- **Key zeroing** — private key bytes are cleared from memory immediately after signing to reduce the key's exposure window.
- **Address validation** — `TransactionBuilder` now validates the derived CashAddress before using it, throwing a `MintCoreError` with a descriptive message if the address cannot be decoded.
- **UTXO schema guard** — Malformed entries are dropped; if every non-empty entry is malformed, the provider throws a `MintCoreError` with a clear schema message.
- **BCMR URI length limit** — `bcmrUri` values exceeding 512 bytes are now rejected with a `MintCoreError` during schema validation.
- **Deterministic UTXO ordering** — inputs are sorted by `txid` then `vout` before signing, ensuring a canonical and reproducible transaction layout. This makes txids reproducible across runs and providers, which simplifies snapshot tests and regression detection.

### Removed

---

## [1.2.0] — WalletConnect v2 Engine

### Added

- **WalletConnect v2 support for Bitcoin Cash** — new wallet engine under `src/wallet/`
  that connects to BCH wallets via the WalletConnect v2 protocol.
- **`WalletClient`** — low-level adapter wrapping a duck-typed `WalletConnectV2Client`;
  resolves addresses via `bch_getAccounts` and signs via `bch_signTransaction` /
  `personal_sign`.
- **`WalletManager`** — high-level lifecycle orchestrator; manages connection state,
  delegates signing to `WalletClient`, and emits typed events.
- **`WalletTypes`** — shared enumerations (`WalletType`, `WalletConnectionState`),
  constants (`BCH_CHAIN_IDS`), and interfaces (`WalletSession`, `WalletEventPayload`).
- **Public wallet API** — `connect`, `disconnect`, `getAddress`, `getWalletType`,
  `signTransaction`, `signMessage` exposed via `WalletManager`.
- **Event system** — `connected`, `disconnected`, `stateChange`, and `error` events
  for reactive wallet state management.
- **BCH namespace support** — `bch:bitcoincash`, `bch:bchtest`, and `bch:bchreg`.
- **Supported wallets** — Paytaca, Cashonize, and Zapit enumerated in `WalletType`.
- **No UI included** — engine only; no modal, dialog, React component, or DOM access.
- **Updated internal architecture** — wallet subsystem is modular and independently
  importable without affecting the existing minting engine.

---

## [0.1.0] - 2025-01-01

### Added

- Initial release of MintCore.
- Core minting engine for CashTokens (FT and NFT) built on `@bitauth/libauth`.
- Hex encoding/decoding utilities.
- TypeScript type definitions for all public exports.
- Vitest-based test suite.

[Unreleased]: https://github.com/mintcoredev/MintCore/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/mintcoredev/MintCore/compare/v0.1.0...v1.2.0
[0.1.0]: https://github.com/mintcoredev/MintCore/releases/tag/v0.1.0
