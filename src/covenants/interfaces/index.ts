/**
 * Covenant interfaces for MintCore Phase Three.
 *
 * Defines the structural shapes for describing covenant behaviour.
 * This module is data-only — no script generation, no enforcement logic,
 * no blockchain RPC calls.
 */

import type { TokenId } from "../../types/TokenPrimitives.js";

// ── CovenantCondition ──────────────────────────────────────────────────────

/**
 * Describes a single rule that must be satisfied within a covenant.
 *
 * `CovenantCondition` is intentionally generic: it carries a `type` tag
 * that higher-level modules can interpret, plus an optional `params` bag
 * for any extra data the condition requires.  MintCore itself never
 * evaluates or enforces conditions.
 */
export interface CovenantCondition {
  /** Discriminant string identifying the kind of condition. */
  type: string;
  /** Arbitrary parameters required to evaluate this condition. */
  params?: Record<string, unknown>;
}

// ── CovenantInputConstraint ────────────────────────────────────────────────

/**
 * Describes constraints placed on the inputs of a covenanted transaction.
 *
 * All fields are optional; an empty object represents an unconstrained
 * input set.
 */
export interface CovenantInputConstraint {
  /** Token identifiers that must be present among the transaction inputs. */
  requiredTokens?: TokenId[];
  /** Minimum total satoshi value that inputs must supply. */
  minSatoshis?: number;
  /** Additional application-defined conditions. */
  customConditions?: CovenantCondition[];
}

// ── CovenantOutputConstraint ───────────────────────────────────────────────

/**
 * Describes constraints placed on the outputs of a covenanted transaction.
 *
 * All fields are optional; an empty object represents an unconstrained
 * output set.
 */
export interface CovenantOutputConstraint {
  /** Locking-script addresses that outputs are permitted to target. */
  allowedRecipients?: string[];
  /**
   * Required distribution of tokens across outputs.
   * Maps each {@link TokenId} to the number of output UTXOs that must carry it.
   */
  requiredTokenDistribution?: Record<TokenId, number>;
  /** Additional application-defined conditions. */
  customConditions?: CovenantCondition[];
}

// ── CovenantDefinition ─────────────────────────────────────────────────────

/**
 * The complete, versioned description of a covenant.
 *
 * A `CovenantDefinition` is pure data: it describes *what* a covenant
 * requires, but contains no script bytecode and no enforcement logic.
 * Script generation and on-chain enforcement are the responsibility of
 * application-layer modules that consume this definition.
 */
export interface CovenantDefinition {
  /** Human-readable identifier for this covenant (non-empty). */
  name: string;
  /** Monotonically increasing integer version of this covenant definition. */
  version: number;
  /** Input constraints, applied in order. */
  inputs: CovenantInputConstraint[];
  /** Output constraints, applied in order. */
  outputs: CovenantOutputConstraint[];
  /** Arbitrary key-value metadata for consumer use. */
  metadata?: Record<string, unknown>;
}
