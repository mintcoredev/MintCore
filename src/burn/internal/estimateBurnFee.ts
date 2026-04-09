// Internal helper: P2PKH-based fee estimation for BCH burn transactions.

// TODO: Add P2TR and P2WSH input/output size support when SegWit or Taproot
//       equivalents are needed on BCH forks or future protocol upgrades.

// TODO: Replace the static per-byte multiplier with dynamic fee estimation
//       (e.g. using mempool fee-rate data from an ElectrumX/Chronik provider).

// TODO: Adjust output size constant when OP_RETURN outputs are included, as
//       they can vary significantly in byte length (1–223 bytes payload).

/** Estimated byte sizes for standard P2PKH transaction components. */
const INPUT_SIZE = 148; // P2PKH input (outpoint 41 + scriptSig ~107 + sequence 4)
const OUTPUT_SIZE = 34; // P2PKH output (value 8 + scriptPubKey 26)
const BASE_TX_SIZE = 10; // version 4 + input/output count varints + locktime 4

/**
 * Extra bytes added per CashTokens input or output (category 32 + capability/flag 1
 * + amount varint ~1-9 bytes; 50 bytes is the conservative upper bound used
 * throughout the minting engine).
 */
const TOKEN_PREFIX_OVERHEAD = 50;

/**
 * Estimates the miner fee for a BCH transaction with the given input/output
 * counts, assuming all inputs and outputs are standard P2PKH.
 *
 * @param inputCount      - Number of transaction inputs.
 * @param outputCount     - Number of transaction outputs.
 * @param feeRate         - Fee rate in satoshis per byte.
 * @param numTokenInputs  - Number of inputs that carry a CashToken (each adds
 *                          {@link TOKEN_PREFIX_OVERHEAD} bytes). Defaults to 0.
 * @param numTokenOutputs - Number of outputs that carry a CashToken (each adds
 *                          {@link TOKEN_PREFIX_OVERHEAD} bytes). Defaults to 0.
 * @returns               Estimated fee in satoshis as a `bigint`.
 */
export function estimateBurnFee(
  inputCount: number,
  outputCount: number,
  feeRate: number,
  numTokenInputs: number = 0,
  numTokenOutputs: number = 0,
): bigint {
  const txBytes =
    BASE_TX_SIZE +
    inputCount * INPUT_SIZE +
    outputCount * OUTPUT_SIZE +
    numTokenInputs * TOKEN_PREFIX_OVERHEAD +
    numTokenOutputs * TOKEN_PREFIX_OVERHEAD;
  return BigInt(Math.ceil(txBytes * feeRate));
}
