/**
 * Type guards and validation helpers for MintCore Phase Three.
 *
 * Provides structural type guards and minimal assertion helpers for
 * covenant interfaces.  No covenant logic is evaluated or enforced.
 */

import { MintCoreError } from "../../utils/errors.js";
import type {
  CovenantCondition,
  CovenantDefinition,
  CovenantInputConstraint,
  CovenantOutputConstraint,
} from "../interfaces/index.js";

// ── Type guards ────────────────────────────────────────────────────────────

/**
 * Returns `true` when `value` is a structurally valid {@link CovenantCondition}.
 *
 * Checks:
 * - `type` is a non-empty string
 * - `params`, when present, is a plain object (not an array)
 */
export function isCovenantCondition(value: unknown): value is CovenantCondition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== "string" || v.type.trim().length === 0) return false;
  if (v.params !== undefined) {
    if (typeof v.params !== "object" || v.params === null || Array.isArray(v.params)) {
      return false;
    }
  }
  return true;
}

/**
 * Returns `true` when `value` is a structurally valid
 * {@link CovenantInputConstraint}.
 *
 * Checks:
 * - `requiredTokens`, when present, is an array of strings
 * - `minSatoshis`, when present, is a finite non-negative number
 * - `customConditions`, when present, is an array of valid
 *   {@link CovenantCondition} objects
 */
export function isCovenantInputConstraint(
  value: unknown
): value is CovenantInputConstraint {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.requiredTokens !== undefined) {
    if (
      !Array.isArray(v.requiredTokens) ||
      !v.requiredTokens.every((t) => typeof t === "string")
    ) {
      return false;
    }
  }
  if (v.minSatoshis !== undefined) {
    if (
      typeof v.minSatoshis !== "number" ||
      !Number.isFinite(v.minSatoshis) ||
      v.minSatoshis < 0
    ) {
      return false;
    }
  }
  if (v.customConditions !== undefined) {
    if (
      !Array.isArray(v.customConditions) ||
      !v.customConditions.every(isCovenantCondition)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Returns `true` when `value` is a structurally valid
 * {@link CovenantOutputConstraint}.
 *
 * Checks:
 * - `allowedRecipients`, when present, is an array of strings
 * - `requiredTokenDistribution`, when present, is a plain object whose
 *   values are non-negative numbers
 * - `customConditions`, when present, is an array of valid
 *   {@link CovenantCondition} objects
 */
export function isCovenantOutputConstraint(
  value: unknown
): value is CovenantOutputConstraint {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (v.allowedRecipients !== undefined) {
    if (
      !Array.isArray(v.allowedRecipients) ||
      !v.allowedRecipients.every((r) => typeof r === "string")
    ) {
      return false;
    }
  }
  if (v.requiredTokenDistribution !== undefined) {
    if (
      typeof v.requiredTokenDistribution !== "object" ||
      v.requiredTokenDistribution === null ||
      Array.isArray(v.requiredTokenDistribution)
    ) {
      return false;
    }
    for (const val of Object.values(
      v.requiredTokenDistribution as Record<string, unknown>
    )) {
      if (typeof val !== "number" || !Number.isFinite(val) || val < 0) {
        return false;
      }
    }
  }
  if (v.customConditions !== undefined) {
    if (
      !Array.isArray(v.customConditions) ||
      !v.customConditions.every(isCovenantCondition)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Returns `true` when `value` is a structurally valid {@link CovenantDefinition}.
 *
 * Checks:
 * - `name` is a non-empty string
 * - `version` is a positive integer
 * - `inputs` is an array of valid {@link CovenantInputConstraint} objects
 * - `outputs` is an array of valid {@link CovenantOutputConstraint} objects
 * - `metadata`, when present, is a plain object
 */
export function isCovenantDefinition(value: unknown): value is CovenantDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || v.name.trim().length === 0) return false;
  if (
    typeof v.version !== "number" ||
    !Number.isInteger(v.version) ||
    v.version < 1
  ) {
    return false;
  }
  if (
    !Array.isArray(v.inputs) ||
    !v.inputs.every(isCovenantInputConstraint)
  ) {
    return false;
  }
  if (
    !Array.isArray(v.outputs) ||
    !v.outputs.every(isCovenantOutputConstraint)
  ) {
    return false;
  }
  if (v.metadata !== undefined) {
    if (
      typeof v.metadata !== "object" ||
      v.metadata === null ||
      Array.isArray(v.metadata)
    ) {
      return false;
    }
  }
  return true;
}

// ── Assertion helpers ──────────────────────────────────────────────────────

/**
 * Assert that `value` is a structurally valid {@link CovenantCondition}.
 *
 * @throws {MintCoreError} when `value` does not satisfy the
 *   {@link CovenantCondition} shape.
 */
export function assertCovenantCondition(
  value: unknown
): asserts value is CovenantCondition {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MintCoreError("CovenantCondition must be a non-null object");
  }
  const v = value as Record<string, unknown>;
  if (typeof v.type !== "string" || v.type.trim().length === 0) {
    throw new MintCoreError("CovenantCondition.type must be a non-empty string");
  }
  if (v.params !== undefined) {
    if (typeof v.params !== "object" || v.params === null || Array.isArray(v.params)) {
      throw new MintCoreError("CovenantCondition.params must be a plain object when provided");
    }
  }
}

/**
 * Assert that `value` is a structurally valid {@link CovenantDefinition}.
 *
 * @throws {MintCoreError} on the first constraint violation.
 */
export function assertCovenantDefinition(
  value: unknown
): asserts value is CovenantDefinition {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MintCoreError("CovenantDefinition must be a non-null object");
  }
  const v = value as Record<string, unknown>;
  if (typeof v.name !== "string" || v.name.trim().length === 0) {
    throw new MintCoreError("CovenantDefinition.name must be a non-empty string");
  }
  if (
    typeof v.version !== "number" ||
    !Number.isInteger(v.version) ||
    v.version < 1
  ) {
    throw new MintCoreError(
      `CovenantDefinition.version must be a positive integer, got ${v.version}`
    );
  }
  if (!Array.isArray(v.inputs)) {
    throw new MintCoreError("CovenantDefinition.inputs must be an array");
  }
  for (let i = 0; i < (v.inputs as unknown[]).length; i++) {
    if (!isCovenantInputConstraint((v.inputs as unknown[])[i])) {
      throw new MintCoreError(
        `CovenantDefinition.inputs[${i}] is not a valid CovenantInputConstraint`
      );
    }
  }
  if (!Array.isArray(v.outputs)) {
    throw new MintCoreError("CovenantDefinition.outputs must be an array");
  }
  for (let i = 0; i < (v.outputs as unknown[]).length; i++) {
    if (!isCovenantOutputConstraint((v.outputs as unknown[])[i])) {
      throw new MintCoreError(
        `CovenantDefinition.outputs[${i}] is not a valid CovenantOutputConstraint`
      );
    }
  }
  if (v.metadata !== undefined) {
    if (
      typeof v.metadata !== "object" ||
      v.metadata === null ||
      Array.isArray(v.metadata)
    ) {
      throw new MintCoreError(
        "CovenantDefinition.metadata must be a plain object when provided"
      );
    }
  }
}
