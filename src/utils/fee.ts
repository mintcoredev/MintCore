/**
 * Transaction size constants (bytes) for BCH P2PKH inputs/outputs.
 *
 * P2PKH input  = 32 (outpoint txid)
 *              +  4 (outpoint vout)
 *              +  1 (scriptLen varint)
 *              + 72 (DER signature + sighash byte, upper bound)
 *              +  1 (OP_DATA_72 push opcode)
 *              + 33 (compressed pubkey)
 *              +  1 (OP_DATA_33 push opcode)
 *              +  4 (sequence)
 *              = 148 bytes
 *
 * P2PKH output = 8 (value) + 1 (scriptLen) + 25 (P2PKH script) = 34 bytes
 *
 * Token prefix overhead (CashTokens): ~50 bytes (category 32 + capability/flag + amount varint)
 *
 * Minting baton input overhead: ~41 bytes extra for the token-prefix reference
 * on an input that spends a CashTokens minting-baton UTXO (category 32 + flags
 * 1 + capability 1 + varint 1 + padding 6 bytes ≈ 41 bytes conservative upper
 * bound used for fee-estimation purposes).
 *
 * Transaction overhead = 4 (version) + 1 (input count varint) + 1 (output count varint) + 4 (locktime) = 10 bytes
 */

export const P2PKH_INPUT_SIZE = 148;
export const P2PKH_OUTPUT_SIZE = 34;
export const TOKEN_PREFIX_OVERHEAD = 50;
/** Conservative per-input overhead when spending a CashTokens minting-baton UTXO. */
export const MINTING_BATON_INPUT_OVERHEAD = 41;
export const TX_OVERHEAD = 10;
/** Minimum value (satoshis) for a token-bearing output so it is not considered dust. */
export const TOKEN_OUTPUT_DUST = 1000;
/** Minimum change output value to avoid creating dust. */
export const DUST_THRESHOLD = 546;
export const DEFAULT_FEE_RATE = 1.0;

/**
 * Estimate the serialized transaction size in bytes and return the fee in
 * satoshis (rounded up to the nearest integer).
 *
 * @param numInputs       - number of P2PKH inputs
 * @param numOutputs      - total number of outputs (including token, OP_RETURN, change)
 * @param feeRate         - sat/byte (default: 1.0)
 * @param numTokenOutputs - number of outputs carrying a CashToken (each adds
 *                          TOKEN_PREFIX_OVERHEAD bytes); defaults to 1
 */
export function estimateFee(
  numInputs: number,
  numOutputs: number,
  feeRate: number = DEFAULT_FEE_RATE,
  numTokenOutputs: number = 1
): number {
  const size =
    TX_OVERHEAD +
    numInputs * P2PKH_INPUT_SIZE +
    numOutputs * P2PKH_OUTPUT_SIZE +
    numTokenOutputs * TOKEN_PREFIX_OVERHEAD;
  return Math.ceil(size * feeRate);
}

/**
 * Estimate the serialized size in bytes of a batch-minting transaction.
 *
 * Each of the `numTokenOutputs` outputs independently carries a CashTokens
 * prefix (category + capability + amount), so the overhead is multiplied by
 * the output count — unlike `estimateFee` which adds the prefix only once.
 *
 * @param numInputs        - number of P2PKH funding inputs
 * @param numTokenOutputs  - number of token-bearing outputs
 * @param numChangeOutputs - number of plain BCH change outputs (typically 0 or 1)
 * @param hasMintingBaton  - when `true`, adds {@link MINTING_BATON_INPUT_OVERHEAD}
 *                           for the extra bytes associated with spending a
 *                           CashTokens minting-baton input
 */
export function estimateBatchTxSize(
  numInputs: number,
  numTokenOutputs: number,
  numChangeOutputs: number,
  hasMintingBaton: boolean = false
): number {
  return (
    TX_OVERHEAD +
    numInputs * P2PKH_INPUT_SIZE +
    (hasMintingBaton ? MINTING_BATON_INPUT_OVERHEAD : 0) +
    numTokenOutputs * (P2PKH_OUTPUT_SIZE + TOKEN_PREFIX_OVERHEAD) +
    numChangeOutputs * P2PKH_OUTPUT_SIZE
  );
}

/**
 * Estimate the fee in satoshis for a batch-minting transaction.
 *
 * The raw fee is computed from {@link estimateBatchTxSize} and rounded up.
 * An optional safety margin is then applied on top to guard against small
 * size-estimation errors.
 *
 * @param numInputs           - number of P2PKH funding inputs
 * @param numTokenOutputs     - number of token-bearing outputs
 * @param numChangeOutputs    - number of plain BCH change outputs
 * @param feeRate             - sat/byte (default: {@link DEFAULT_FEE_RATE})
 * @param safetyMarginPercent - percentage added on top of the raw fee (0–100, default: 0)
 * @param hasMintingBaton     - whether one input is a CashTokens minting baton
 */
export function estimateBatchTxFee(
  numInputs: number,
  numTokenOutputs: number,
  numChangeOutputs: number,
  feeRate: number = DEFAULT_FEE_RATE,
  safetyMarginPercent: number = 0,
  hasMintingBaton: boolean = false
): number {
  const size = estimateBatchTxSize(
    numInputs,
    numTokenOutputs,
    numChangeOutputs,
    hasMintingBaton
  );
  const rawFee = Math.ceil(size * feeRate);
  return Math.ceil(rawFee * (1 + safetyMarginPercent / 100));
}
