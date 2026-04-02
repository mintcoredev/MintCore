// Burn amount calculation helpers.

/**
 * Calculate the number of tokens to burn given a total supply and a burn ratio.
 *
 * @param totalSupply - Total fungible token supply.
 * @param burnRatio   - Fraction to burn (0 < burnRatio <= 1).
 * @returns           Number of tokens to burn (truncated toward zero).
 */
export function calculateBurnAmounts(totalSupply: bigint, burnRatio: number): bigint {
  if (burnRatio <= 0 || burnRatio > 1) {
    throw new RangeError(`burnRatio must be in the range (0, 1], got ${burnRatio}`);
  }
  if (totalSupply < 0n) {
    throw new RangeError(`totalSupply must be non-negative, got ${totalSupply}`);
  }
  // Multiply using integer arithmetic to avoid floating-point imprecision.
  // burnRatio is converted to a rational numerator/denominator with up to 15
  // significant decimal digits, then the integer division is performed.
  const PRECISION = 1_000_000_000_000_000n; // 10^15
  const numerator = BigInt(Math.round(burnRatio * Number(PRECISION)));
  return (totalSupply * numerator) / PRECISION;
}

/**
 * Split a burn amount evenly across `parts` buckets.
 * The first bucket absorbs any remainder from integer division.
 *
 * @param amount - Total amount to split.
 * @param parts  - Number of buckets (must be >= 1).
 * @returns      Array of `parts` bigints that sum to `amount`.
 */
export function splitBurn(amount: bigint, parts: number): bigint[] {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new RangeError(`parts must be a positive integer, got ${parts}`);
  }
  if (amount < 0n) {
    throw new RangeError(`amount must be non-negative, got ${amount}`);
  }
  const bigParts = BigInt(parts);
  const base = amount / bigParts;
  const remainder = amount % bigParts;
  const result: bigint[] = [];
  for (let i = 0; i < parts; i++) {
    result.push(i === 0 ? base + remainder : base);
  }
  return result;
}
