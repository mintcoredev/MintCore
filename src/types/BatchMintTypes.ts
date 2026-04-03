import type { Utxo } from "./TransactionTypes.js";

/**
 * A single token mint request within a batch.
 *
 * Each request describes one token output to be created. Multiple requests
 * can be grouped into a single BCH transaction by `BatchMintEngine`.
 */
export interface MintRequest {
  /**
   * Token category as a 64-character hex string (32-byte txid in display
   * order). Optional — when omitted the category is auto-derived from the
   * first input of the genesis transaction.
   */
  category?: string;
  /**
   * NFT capability for this output.
   *  - "none"    — standard output (FT or non-capability NFT)
   *  - "mutable" — NFT whose commitment can be updated by the holder
   *  - "minting" — NFT with a minting baton; preserves minting capability
   */
  capability: "none" | "mutable" | "minting";
  /**
   * Fungible token amount to mint (BigInt). Use `0n` for pure NFTs with no
   * fungible component.
   */
  amount: bigint;
  /**
   * NFT commitment bytes as a hex string (with or without `0x` prefix) or a
   * UTF-8 string. Required when creating an NFT output. Max 40 bytes per the
   * CashTokens specification.
   */
  commitment?: string;
  /**
   * CashAddress of the token recipient. Defaults to the funding address
   * derived from `MintConfig.privateKey` when omitted.
   */
  recipientAddress?: string;
}

/**
 * Tuning options accepted by `planMintBatch` and `executeMintBatch`.
 */
export interface BatchMintOptions {
  /**
   * Maximum number of token outputs to include in a single transaction.
   * Controls how many `MintRequest`s are grouped per on-chain transaction.
   * Default: 20. Must be between 1 and 1000.
   */
  maxOutputsPerTx?: number;
  /**
   * Hard fee cap in satoshis per transaction. `planMintBatch` throws a
   * `MintCoreError` if any planned transaction's estimated fee would exceed
   * this value. Default: unlimited.
   */
  maxFeePerTx?: number;
  /**
   * Fee rate in sat/byte used for fee estimation.
   * Falls back to `MintConfig.feeRate` then `DEFAULT_FEE_RATE` (1.0).
   */
  feeRate?: number;
  /**
   * Safety margin added on top of the raw fee estimate, expressed as a
   * percentage (0–100). Use this to avoid under-paying fees when the actual
   * transaction size slightly exceeds the estimate. Default: 10.
   */
  feeSafetyMarginPercent?: number;
  /**
   * When `true`, `executeMintBatch` continues to the next planned transaction
   * after a broadcast failure instead of aborting immediately. Failed
   * transactions are recorded in `MintExecutionResult.failures`. Default: false.
   */
  continueOnFailure?: boolean;
}

/**
 * One planned transaction within a `BatchMintPlan`.
 *
 * Contains everything needed to construct and sign the transaction:
 * the mint requests it covers, the UTXOs allocated as inputs (when a UTXO
 * provider is configured), and the fee/size estimates.
 */
export interface PlannedTransaction {
  /** Zero-based position of this transaction within the batch. */
  index: number;
  /** Mint requests assigned to this transaction. */
  mintRequests: MintRequest[];
  /**
   * UTXOs allocated as inputs during planning.
   * Empty when no UTXO provider is configured (offline planning).
   */
  inputs: Utxo[];
  /** Estimated fee in satoshis (includes the configured safety margin). */
  estimatedFee: number;
  /** Estimated serialized transaction size in bytes. */
  estimatedSize: number;
  /**
   * Change output value in satoshis.
   * 0 when the surplus is below `DUST_THRESHOLD` or when no UTXOs were
   * assigned (offline planning).
   */
  changeOutput: number;
  /**
   * Total satoshis carried by all outputs of this transaction
   * (`numMintOutputs × TOKEN_OUTPUT_DUST + changeOutput`).
   */
  totalOutputValue: number;
}

/**
 * The result of `planMintBatch`: a complete, ordered mint schedule.
 *
 * Inspect the plan before calling `executeMintBatch` to review estimated
 * costs and to display a confirmation UI.
 *
 * **Important — in-memory locks only.** The UTXOs allocated to each
 * {@link PlannedTransaction} are locked in memory for the lifetime of the
 * `BatchMintEngine` instance.  These locks are **not persisted** to disk.  If
 * the process is restarted, or if a new `BatchMintEngine` instance is created,
 * all lock state is lost and the same UTXOs could be selected again by a
 * subsequent `planMintBatch` call.  To avoid double-spend scenarios across
 * restarts, serialise the `BatchMintPlan` to durable storage immediately after
 * planning and restore it before calling `executeMintBatch`.
 */
export interface BatchMintPlan {
  /** Ordered list of planned transactions, one per chunk of mint requests. */
  transactions: PlannedTransaction[];
  /** Total number of on-chain transactions required. */
  totalTransactions: number;
  /** Total number of mint requests across all transactions. */
  totalMints: number;
  /** Sum of all per-transaction estimated fees in satoshis. */
  totalEstimatedFee: number;
  /**
   * Total satoshis required to execute the full batch
   * (`sum of all token-output dust + all fees`).
   */
  totalCost: number;
  /** Minimum wallet balance required — identical to `totalCost`. */
  requiredBalance: number;
}

/**
 * The result returned by `executeMintBatch` after all planned transactions
 * have been signed and broadcast.
 */
export interface MintExecutionResult {
  /**
   * Txids of every successfully broadcast transaction, in plan order.
   * Transactions that failed are omitted; see `failures` for details.
   */
  txids: string[];
  /**
   * Per-request execution record mapping each `MintRequest` to the
   * transaction it was included in and its output index within that transaction.
   */
  mintResults: Array<{
    request: MintRequest;
    txid: string;
    outputIndex: number;
  }>;
  /** Total fees paid in satoshis across all successful transactions. */
  totalFeePaid: number;
  /**
   * Details of any transaction-level failures.
   * Empty when all transactions succeeded.
   */
  failures: Array<{
    /** Zero-based index of the failing transaction within the plan. */
    txIndex: number;
    /** Human-readable error description. */
    error: string;
    /** Mint requests that were not processed due to this failure. */
    requests: MintRequest[];
  }>;
}
