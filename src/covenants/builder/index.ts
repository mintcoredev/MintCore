/**
 * Abstract CovenantBuilder for MintCore Phase Three.
 *
 * Provides a structural extension point for future covenant modules.
 * The builder assembles a {@link CovenantDefinition} from discrete,
 * overrideable steps — it does NOT generate scripts or enforce rules.
 */

import { MintCoreError } from "../../utils/errors.js";
import type {
  CovenantDefinition,
  CovenantInputConstraint,
  CovenantOutputConstraint,
} from "../interfaces/index.js";

/**
 * Abstract base class for covenant builders.
 *
 * Subclasses must implement {@link defineInputs} and {@link defineOutputs}.
 * Optionally override {@link getMetadata} to attach arbitrary metadata to the
 * assembled {@link CovenantDefinition}.
 *
 * @example
 * ```ts
 * class MyCovenant extends CovenantBuilder {
 *   constructor() { super("MyCovenant", 1); }
 *   defineInputs() { return [{ minSatoshis: 1000 }]; }
 *   defineOutputs() { return [{ allowedRecipients: ["bitcoincash:q..."] }]; }
 * }
 * const def = new MyCovenant().build();
 * ```
 */
export abstract class CovenantBuilder {
  /**
   * @param name    - Human-readable covenant name (non-empty).
   * @param version - Positive integer version of this covenant definition.
   */
  constructor(
    protected readonly name: string,
    protected readonly version: number
  ) {}

  /**
   * Return the input constraints for this covenant.
   *
   * Implementations should return an array of {@link CovenantInputConstraint}
   * objects describing what the covenant requires of its inputs.
   */
  abstract defineInputs(): CovenantInputConstraint[];

  /**
   * Return the output constraints for this covenant.
   *
   * Implementations should return an array of {@link CovenantOutputConstraint}
   * objects describing what the covenant requires of its outputs.
   */
  abstract defineOutputs(): CovenantOutputConstraint[];

  /**
   * Return arbitrary metadata to attach to the assembled definition.
   *
   * The default implementation returns an empty object.  Override to supply
   * covenant-specific metadata.
   */
  getMetadata(): Record<string, unknown> {
    return {};
  }

  /**
   * Assemble and return a {@link CovenantDefinition}.
   *
   * Validates that required fields are present and well-formed before
   * returning the definition.  Does NOT generate scripts or enforce rules.
   *
   * @throws {MintCoreError} when `name` is empty or `version` is not a
   *   positive integer.
   */
  build(): CovenantDefinition {
    if (typeof this.name !== "string" || this.name.trim().length === 0) {
      throw new MintCoreError("CovenantBuilder: name must be a non-empty string");
    }
    if (
      typeof this.version !== "number" ||
      !Number.isInteger(this.version) ||
      this.version < 1
    ) {
      throw new MintCoreError(
        "CovenantBuilder: version must be a positive integer"
      );
    }

    const inputs = this.defineInputs();
    const outputs = this.defineOutputs();

    if (!Array.isArray(inputs)) {
      throw new MintCoreError("CovenantBuilder.defineInputs() must return an array");
    }
    if (!Array.isArray(outputs)) {
      throw new MintCoreError("CovenantBuilder.defineOutputs() must return an array");
    }

    const metadata = this.getMetadata();
    const definition: CovenantDefinition = {
      name: this.name.trim(),
      version: this.version,
      inputs,
      outputs,
    };
    if (metadata && Object.keys(metadata).length > 0) {
      definition.metadata = metadata;
    }
    return definition;
  }
}
