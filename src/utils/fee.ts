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
 * Transaction overhead = 4 (version) + 1 (input count varint) + 1 (output count varint) + 4 (locktime) = 10 bytes
 */

export const P2PKH_INPUT_SIZE = 148;
export const P2PKH_OUTPUT_SIZE = 34;
export const TOKEN_PREFIX_OVERHEAD = 50;
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
 * @param numInputs   - number of P2PKH inputs
 * @param numOutputs  - total number of outputs (including token, OP_RETURN, change)
 * @param feeRate     - sat/byte (default: 1.0)
 * @param hasToken    - whether one output carries a CashToken (adds TOKEN_PREFIX_OVERHEAD)
 */
export function estimateFee(
  numInputs: number,
  numOutputs: number,
  feeRate: number = DEFAULT_FEE_RATE,
  hasToken: boolean = true
): number {
  const size =
    TX_OVERHEAD +
    numInputs * P2PKH_INPUT_SIZE +
    numOutputs * P2PKH_OUTPUT_SIZE +
    (hasToken ? TOKEN_PREFIX_OVERHEAD : 0);
  return Math.ceil(size * feeRate);
}
