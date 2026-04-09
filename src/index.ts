/**
 * MintCore SDK — public entry point.
 *
 * Re-exports all public types, helpers, and classes from their respective
 * modules.  Import everything from `"mintcore"` rather than from internal
 * module paths.
 */

// ── Token operations (mint, baton, category, metadata, BCMR) ────────────────
export * from "./cashTokens/index.js";

// ── Transaction helpers ──────────────────────────────────────────────────────
export * from "./transactions/index.js";

// ── Script primitives (P2PKH, P2SH, OP_RETURN, opcodes) ─────────────────────
export * from "./scripts/index.js";

// ── Utilities (hex, fee, coin-selection, validation, keys, encoding) ─────────
export * from "./utils/index.js";

// ── TypeScript types and interfaces ──────────────────────────────────────────
export * from "./types/index.js";

/** Current SDK version string. */
export { VERSION } from "./version.js";

// ── Core engines ──────────────────────────────────────────────────────────────
/** Single-token minting engine. */
export { MintEngine } from "./core/MintEngine.js";
/** Batch minting engine for planning and executing large-scale mint operations. */
export { BatchMintEngine } from "./core/BatchMintEngine.js";
/** Low-level transaction builder; wraps libauth for CashTokens genesis transactions. */
export { TransactionBuilder } from "./core/TransactionBuilder.js";
/** Convenience adapter wrapping `TransactionBuilder` with a named `buildMintTransaction` method. */
export { LibauthAdapter } from "./adapters/LibauthAdapter.js";

// ── Phase Two: Packs, Items, Rarity ──────────────────────────────────────────
export * from "./rarity/index.js";
export * from "./items/index.js";
export * from "./packs/index.js";
export * from "./serialization/index.js";

// ── Phase Three: Covenant data layer ─────────────────────────────────────────
export * from "./covenants/index.js";
