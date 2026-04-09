# Changelog

All notable changes to MintCore are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this
project adheres to [Semantic Versioning](docs/VERSIONING.md).

---

## [Unreleased] — Phase Four: Documentation, Examples & API Clarity

### Added

- **Full documentation site** under `/docs`:
  - `docs/getting-started.md` — installation, basic usage, minimal examples.
  - `docs/core/token-primitives.md` — branded types, type guards, validation helpers.
  - `docs/core/utxo-models.md` — `BaseUtxo`, `TokenUtxo`, assertion helpers.
  - `docs/core/transaction-builder.md` — `TransactionBuilder`, `MintConfig`, `TokenSchema`.
  - `docs/assets/packs.md` — `PackDefinition`, `PackMetadata`, type guards.
  - `docs/assets/items.md` — `ItemDefinition`, `ItemMetadata`, type guards.
  - `docs/assets/rarity.md` — `Rarity` enum, `isRarity`, `rarityToString`.
  - `docs/covenants/covenant-interfaces.md` — all covenant interface types.
  - `docs/covenants/covenant-builder.md` — abstract `CovenantBuilder` class.
  - `docs/covenants/covenant-utils.md` — `hashCovenantDefinition`, metadata encode/decode.
  - `docs/serialization/json-helpers.md` — `serializePack`, `deserializePack`, and item equivalents.
- **Three self-contained example projects** under `/examples`:
  - `examples/create-token/` — `TokenId`, `TokenUtxo`, metadata schema v1.
  - `examples/define-pack/` — `PackDefinition`, `ItemDefinition`, `Rarity`, JSON serialization.
  - `examples/covenant-structure/` — `CovenantBuilder`, hashing, metadata encoding.
- **Public API exports** — `TokenPrimitives`, `UtxoTypes`, and `MetadataSchema` now exported from the main `"mintcore"` package entry point.
- **JSDoc** added to `src/index.ts`, `LibauthAdapter`, and `VERSION`.
- **`VERSIONING.md`** — expanded with module compatibility expectations.

### Changed

- `README.md` — overhauled with scope statement, quickstart, and documentation links.

---

## [0.1.4] - 2026-03-28 — Phase Three: Covenant Data Layer

### Added

- **Covenant module** (`src/covenants/`) — pure data layer for describing CashTokens covenant structures.
  - `CovenantCondition` — generic condition descriptor with a type tag and optional params.
  - `CovenantInputConstraint` / `CovenantOutputConstraint` — input and output constraint interfaces.
  - `CovenantDefinition` — complete, versioned covenant description (pure data; no script bytecode).
  - `CovenantBuilder` — abstract base class for assembling `CovenantDefinition` objects.
  - `hashCovenantDefinition(def)` — SHA-256 fingerprint of a covenant definition (64-char hex).
  - `encodeCovenantMetadata(meta)` / `decodeCovenantMetadata(encoded)` — Base64 encode/decode for covenant metadata.
  - Type guards: `isCovenantCondition`, `isCovenantInputConstraint`, `isCovenantOutputConstraint`, `isCovenantDefinition`.
  - Assertion helpers: `assertCovenantCondition`, `assertCovenantDefinition`.
- **BCMR generator** — `generateBcmr(options)` builds a spec-compliant CHIP-BCMR v2 JSON document; `hashBcmr(doc)` computes its SHA-256 content hash.
- **`TokenSchema.bcmrHash`** — new optional field; when set with `bcmrUri`, emits `OP_RETURN BCMR <hash> <uri>` (hash-pinned authchain).
- **Key generation** — `generateKey()` generates a cryptographically secure random 32-byte private key as hex.
- **Address derivation** — `deriveAddress(privateKey, network)` derives a P2PKH CashAddress from a private key.

### Changed

- **`WizardConnectClientLike`** renamed to `BchWalletClientLike`.
- **`WizardConnectSession`** renamed to `BchWalletSession`.
- **`WizardAdapter`** renamed to `BaseWalletAdapter`.
- **`WizardAdapterClientLike`** renamed to `WalletAdapterClientLike`.
- **`PaytacaAdapter`**, **`CashonizeAdapter`**, **`ZapitAdapter`** — read directly from `window.*` instead of `window.*.wizardconnect`.

### Removed

- **`WizardConnectProvider`** and **`WizardConnectProviderOptions`** removed.

---

## [0.1.3] - 2026-03-22 — Phase Two: Packs, Items, and Rarity (Data Layer)

### Added

- **Pack definitions** (`src/packs/`) — `PackDefinition`, `PackMetadata`, `PackId`; type guards `isPackDefinition`, `isPackMetadata`; assertion helper `assertPackDefinition`.
- **Item definitions** (`src/items/`) — `ItemDefinition`, `ItemMetadata`, `ItemId`; type guards `isItemDefinition`, `isItemMetadata`; assertion helper `assertItemDefinition`.
- **Rarity enum** (`src/rarity/`) — `Rarity` (Common=0 … Legendary=4); `isRarity` type guard; `rarityToString` helper.
- **JSON serialization** (`src/serialization/`) — `serializePack`, `deserializePack`, `serializeItem`, `deserializeItem`; deterministic and side-effect free.
- **Wizard Connect support** — BCH-native wallet protocol integration (superseded in v0.1.4).

---

## [0.1.2] - 2026-03-21 — Phase One: Core Token Primitives

### Added

- **Core token primitives** (`src/types/TokenPrimitives.ts`) — branded types `TokenId`, `TokenCategory`, `TokenAmount`, `NftCapability`; interfaces `FungibleToken`, `NftData`, `NonFungibleToken`; coercions `toTokenId`, `toTokenCategory`, `toTokenAmount`; type guards and assertion helpers.
- **UTXO models** (`src/types/UtxoTypes.ts`) — `BaseUtxo`, `TokenUtxo`, `UtxoTokenData`; type guards `isBaseUtxo`, `isTokenUtxo`; assertion helpers `assertBaseUtxo`, `assertTokenUtxo`.
- **Metadata schema v1** (`src/types/MetadataSchema.ts`) — `MetadataSchema` interface; `isMetadataSchema` guard; `assertMetadataSchema` helper.
- **Transaction builder scaffolding** (`src/core/TransactionBuilder.ts`) — `TransactionBuilder` class; offline and provider-backed build modes.
- **WalletConnect v2** — BCH wallet engine via WalletConnect v2 (superseded in v0.1.3).

---

## [0.1.1] - 2026-03-14 — Batch Minting Engine

### Added

- **`BatchMintEngine`** — plans and executes large-scale CashTokens mint operations across multiple optimised transactions.
- **`planMintBatch(requests, options?)`** — deterministic planning phase; groups requests into fee-bounded chunks.
- **`executeMintBatch(plan, options?)`** — signs and broadcasts all planned transactions in order.
- **`BatchMintOptions`** — configurable planning parameters.
- **`BatchMintPlan` / `PlannedTransaction` / `MintExecutionResult`** — typed result structures.
- **`MintRequest`** — typed input describing a single token output to mint.
- **`UtxoLock`** — in-memory UTXO lock registry to prevent double-selection within a batch.
- **Fee utilities** — `estimateBatchTxFee`, `estimateBatchTxSize`.

---

## [0.1.0-beta] - 2026-03-01 — Initial Release

### Added

- Initial release of MintCore.
- Core minting engine for CashTokens (FT and NFT) built on `@bitauth/libauth`.
- `MintEngine` — single-token minting engine.
- `TransactionBuilder` — low-level genesis transaction builder.
- `LibauthAdapter` — convenience adapter around `TransactionBuilder`.
- Hex encoding/decoding utilities (`toHex`, `fromHex`).
- TypeScript type definitions for all public exports.
- Vitest-based test suite.

[Unreleased]: https://github.com/mintcoredev/MintCore/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/mintcoredev/MintCore/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/mintcoredev/MintCore/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/mintcoredev/MintCore/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/mintcoredev/MintCore/compare/v0.1.0-beta...v0.1.1
[0.1.0-beta]: https://github.com/mintcoredev/MintCore/releases/tag/v0.1.0-beta

