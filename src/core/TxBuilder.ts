/**
 * Minimal unsigned transaction builder for MintCore v1.0.
 *
 * Provides a simple, chainable API for assembling BCH transactions without
 * any signing logic.  Covenant-aware extensions can be injected via the
 * optional CovenantHook callback.
 *
 * Design goals:
 * - No signing (key material never touches this class).
 * - No network I/O.
 * - Covenant extensions are opt-in through a well-defined hook interface.
 */

import { MintCoreError } from "../utils/errors.js";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * An unsigned transaction input.
 */
export interface TxInput {
  /** Transaction id of the UTXO being spent (64-char lowercase hex). */
  txid: string;
  /** Output index within that transaction. */
  vout: number;
  /** Sequence number (default: 0xffffffff). */
  sequence?: number;
}

/**
 * An unsigned transaction output.
 */
export interface TxOutput {
  /** Locking script for this output (even-length lowercase hex string). */
  lockingScript: string;
  /** Value in satoshis (non-negative integer). */
  satoshis: number;
  /** Optional token data when this output carries CashTokens. */
  token?: {
    /** Token category (64-char lowercase hex). */
    category: string;
    /** Fungible token amount (non-negative bigint). */
    amount?: bigint;
    /** NFT data. */
    nft?: {
      capability: "none" | "mutable" | "minting";
      /** Commitment bytes as even-length lowercase hex. */
      commitment: string;
    };
  };
}

/**
 * The assembled, unsigned transaction produced by TxBuilder.buildUnsigned().
 */
export interface UnsignedTransaction {
  /** Transaction version (always 2 for BCH). */
  version: 2;
  /** Ordered list of inputs. */
  inputs: ReadonlyArray<Required<TxInput>>;
  /** Ordered list of outputs. */
  outputs: ReadonlyArray<TxOutput>;
  /** Lock time. */
  locktime: number;
}

/**
 * Hook invoked on every output just before the transaction is finalised.
 *
 * Covenant-aware extensions can inspect or mutate outputs here.  The hook
 * receives the mutable output array and must return it (or a replacement).
 * The hook must NOT introduce signing logic.
 *
 * @param outputs - Mutable copy of the output list.
 * @returns The (possibly modified) output list.
 */
export type CovenantHook = (outputs: TxOutput[]) => TxOutput[];

// ── Internal validation ────────────────────────────────────────────────────

const HEX64_RE = /^[0-9a-f]{64}$/;
const HEX_EVEN_RE = /^([0-9a-f]{2})*$/;
const VALID_CAPABILITIES = new Set(["none", "mutable", "minting"]);

function validateInput(input: TxInput): void {
  if (typeof input.txid !== "string" || !HEX64_RE.test(input.txid)) {
    throw new MintCoreError(
      `TxInput.txid must be a 64-character lowercase hex string, got "${input.txid}"`
    );
  }
  if (typeof input.vout !== "number" || !Number.isInteger(input.vout) || input.vout < 0) {
    throw new MintCoreError(
      `TxInput.vout must be a non-negative integer, got ${input.vout}`
    );
  }
  if (input.sequence !== undefined) {
    if (
      typeof input.sequence !== "number" ||
      !Number.isInteger(input.sequence) ||
      input.sequence < 0 ||
      input.sequence > 0xffffffff
    ) {
      throw new MintCoreError(
        `TxInput.sequence must be an integer in [0, 0xffffffff], got ${input.sequence}`
      );
    }
  }
}

function validateOutput(output: TxOutput): void {
  if (typeof output.lockingScript !== "string" || !HEX_EVEN_RE.test(output.lockingScript)) {
    throw new MintCoreError(
      `TxOutput.lockingScript must be an even-length lowercase hex string, got "${output.lockingScript}"`
    );
  }
  if (
    typeof output.satoshis !== "number" ||
    !Number.isFinite(output.satoshis) ||
    !Number.isInteger(output.satoshis) ||
    output.satoshis < 0
  ) {
    throw new MintCoreError(
      `TxOutput.satoshis must be a finite non-negative integer, got ${output.satoshis}`
    );
  }
  if (output.token !== undefined) {
    const t = output.token;
    if (!t || typeof t !== "object") {
      throw new MintCoreError("TxOutput.token must be a non-null object when provided");
    }
    if (typeof t.category !== "string" || !HEX64_RE.test(t.category)) {
      throw new MintCoreError(
        `TxOutput.token.category must be a 64-character lowercase hex string, got "${t.category}"`
      );
    }
    if (t.amount !== undefined) {
      if (typeof t.amount !== "bigint" || t.amount < 0n) {
        throw new MintCoreError(
          `TxOutput.token.amount must be a non-negative bigint when provided, got ${t.amount}`
        );
      }
    }
    if (t.nft !== undefined) {
      if (!t.nft || typeof t.nft !== "object") {
        throw new MintCoreError("TxOutput.token.nft must be a non-null object when provided");
      }
      if (!VALID_CAPABILITIES.has(t.nft.capability)) {
        throw new MintCoreError(
          `TxOutput.token.nft.capability must be "none", "mutable", or "minting", got "${t.nft.capability}"`
        );
      }
      if (
        typeof t.nft.commitment !== "string" ||
        !HEX_EVEN_RE.test(t.nft.commitment)
      ) {
        throw new MintCoreError(
          `TxOutput.token.nft.commitment must be an even-length lowercase hex string, got "${t.nft.commitment}"`
        );
      }
    }
  }
}

// ── Builder class ──────────────────────────────────────────────────────────

/**
 * Minimal unsigned BCH transaction builder.
 *
 * Usage:
 * ```ts
 * const tx = new TxBuilder()
 *   .addInput({ txid: "aa".repeat(32), vout: 0 })
 *   .addOutput({ lockingScript: "76a914...88ac", satoshis: 1000 })
 *   .setLocktime(0)
 *   .buildUnsigned();
 * ```
 */
export class TxBuilder {
  private readonly inputs: TxInput[] = [];
  private readonly outputs: TxOutput[] = [];
  private locktime = 0;
  private covenantHook?: CovenantHook;

  /**
   * Register a covenant hook that will be called during buildUnsigned().
   *
   * The hook receives the mutable output list and may return a modified
   * version.  Only one hook may be registered per builder instance; calling
   * this method again replaces the previous hook.
   *
   * @param hook - Callback to invoke before finalising outputs.
   * @returns `this` for chaining.
   */
  withCovenantHook(hook: CovenantHook): this {
    this.covenantHook = hook;
    return this;
  }

  /**
   * Append an input to the transaction.
   *
   * @param input - Input descriptor (txid + vout, optional sequence).
   * @returns `this` for chaining.
   * @throws {MintCoreError} when the input fails validation.
   */
  addInput(input: TxInput): this {
    validateInput(input);
    this.inputs.push(input);
    return this;
  }

  /**
   * Append an output to the transaction.
   *
   * @param output - Output descriptor (lockingScript + satoshis, optional token).
   * @returns `this` for chaining.
   * @throws {MintCoreError} when the output fails validation.
   */
  addOutput(output: TxOutput): this {
    validateOutput(output);
    this.outputs.push(output);
    return this;
  }

  /**
   * Set the transaction lock time.
   *
   * @param locktime - nLockTime value (0–0xffffffff).
   * @returns `this` for chaining.
   * @throws {MintCoreError} when the value is out of range.
   */
  setLocktime(locktime: number): this {
    if (
      typeof locktime !== "number" ||
      !Number.isInteger(locktime) ||
      locktime < 0 ||
      locktime > 0xffffffff
    ) {
      throw new MintCoreError(
        `locktime must be an integer in [0, 0xffffffff], got ${locktime}`
      );
    }
    this.locktime = locktime;
    return this;
  }

  /**
   * Finalise and return the unsigned transaction.
   *
   * If a covenant hook was registered via withCovenantHook() it is called
   * here with a copy of the output list.
   *
   * @returns An immutable UnsignedTransaction object.
   * @throws {MintCoreError} when no inputs or no outputs have been added.
   */
  buildUnsigned(): UnsignedTransaction {
    if (this.inputs.length === 0) {
      throw new MintCoreError("Cannot build transaction: no inputs added");
    }
    if (this.outputs.length === 0) {
      throw new MintCoreError("Cannot build transaction: no outputs added");
    }

    const normalisedInputs: Required<TxInput>[] = this.inputs.map((inp) => ({
      txid: inp.txid,
      vout: inp.vout,
      sequence: inp.sequence ?? 0xffffffff,
    }));

    let finalOutputs: TxOutput[] = this.outputs.map((o) => ({ ...o }));
    if (this.covenantHook) {
      finalOutputs = this.covenantHook(finalOutputs);
    }

    return {
      version: 2,
      inputs: Object.freeze(normalisedInputs),
      outputs: Object.freeze(finalOutputs),
      locktime: this.locktime,
    };
  }
}
