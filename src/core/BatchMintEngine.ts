import {
  secp256k1,
  hash160,
  hash256,
  encodeLockingBytecodeP2pkh,
  lockingBytecodeToCashAddress,
  decodeCashAddress,
  encodeTransactionBCH,
  encodeDataPush,
  generateSigningSerializationBCH,
  NonFungibleTokenCapability,
  CashAddressNetworkPrefix,
} from "@bitauth/libauth";
import type { MintConfig } from "../types/MintConfig.js";
import type { Utxo } from "../types/TransactionTypes.js";
import type {
  MintRequest,
  BatchMintOptions,
  BatchMintPlan,
  PlannedTransaction,
  MintExecutionResult,
} from "../types/BatchMintTypes.js";
import { MintCoreError } from "../utils/errors.js";
import { fromHex, toHex } from "../utils/hex.js";
import {
  estimateBatchTxFee,
  estimateBatchTxSize,
  DEFAULT_FEE_RATE,
  TOKEN_OUTPUT_DUST,
  DUST_THRESHOLD,
} from "../utils/fee.js";
import { fetchUtxos as providerFetchUtxos, broadcastTransaction as providerBroadcast } from "./providerUtils.js";
import { UtxoLock } from "../utils/utxoLock.js";
import { validateMintRequest, validateBatchMintOptions } from "../utils/validate.js";

/** BCH SIGHASH_ALL | SIGHASH_FORKID (0x41). */
const SIGHASH_ALL_FORKID = new Uint8Array([0x41]);

/** Default maximum token outputs included in a single transaction. */
const DEFAULT_MAX_OUTPUTS = 20;

/** Default safety margin applied to fee estimates (10 %). */
const DEFAULT_FEE_SAFETY_MARGIN = 10;

/** Internal transaction structure used during construction. */
interface RawTx {
  version: number;
  inputs: Array<{
    outpointTransactionHash: Uint8Array;
    outpointIndex: number;
    sequenceNumber: number;
    unlockingBytecode: Uint8Array;
  }>;
  outputs: Array<{
    lockingBytecode: Uint8Array;
    valueSatoshis: bigint;
    token?: {
      amount: bigint;
      category: Uint8Array;
      nft?: { capability: NonFungibleTokenCapability; commitment: Uint8Array };
    };
  }>;
  locktime: number;
}

/**
 * Batch-minting engine for Bitcoin Cash CashTokens.
 *
 * Provides two public methods:
 *  - {@link planMintBatch} — pure, deterministic planning (no side-effects)
 *  - {@link executeMintBatch} — signs and broadcasts all planned transactions
 *
 * @example
 * ```ts
 * const engine = new BatchMintEngine({
 *   network: "mainnet",
 *   privateKey: "...",
 *   utxoProviderUrl: "https://chronik.be.cash/bch",
 * });
 *
 * const requests: MintRequest[] = Array.from({ length: 100 }, () => ({
 *   capability: "none",
 *   amount: 1000n,
 * }));
 *
 * const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 20 });
 * console.log(`${plan.totalTransactions} transactions, ~${plan.totalEstimatedFee} sat total fee`);
 *
 * const result = await engine.executeMintBatch(plan);
 * console.log("Broadcast txids:", result.txids);
 * ```
 */
export class BatchMintEngine {
  private readonly hasProvider: boolean;

  /**
   * Per-instance UTXO reservation registry. Locks are acquired before
   * planning and held until execution completes, preventing double-spend
   * across concurrent operations on the same engine instance.
   */
  private readonly lock = new UtxoLock();

  constructor(private readonly config: MintConfig) {
    this.hasProvider = !!(config.utxoProviderUrl || config.electrumxProviderUrl);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Plan a batch of mint operations without broadcasting anything.
   *
   * The plan is **deterministic**: given the same `requests`, `options`, and
   * available UTXOs, this method always returns an identical `BatchMintPlan`.
   * Inspect the plan to preview costs and confirm before calling
   * {@link executeMintBatch}.
   *
   * When no UTXO provider is configured the plan is built in offline mode:
   * UTXOs are not assigned but fee and size estimates are still computed.
   *
   * @param requests - List of mint operations to plan. Must be non-empty.
   * @param options  - Tuning parameters (chunking, fees, safety margins).
   * @returns A complete {@link BatchMintPlan}.
   * @throws {MintCoreError} On validation failure or insufficient UTXOs.
   */
  async planMintBatch(
    requests: MintRequest[],
    options?: BatchMintOptions
  ): Promise<BatchMintPlan> {
    if (requests.length === 0) {
      throw new MintCoreError("At least one MintRequest is required");
    }

    for (const req of requests) {
      validateMintRequest(req);
    }

    if (options) {
      validateBatchMintOptions(options);
    }

    const maxOutputs =
      options?.maxOutputsPerTx ?? DEFAULT_MAX_OUTPUTS;
    const feeRate =
      options?.feeRate ?? this.config.feeRate ?? DEFAULT_FEE_RATE;
    const safetyMargin =
      options?.feeSafetyMarginPercent ?? DEFAULT_FEE_SAFETY_MARGIN;
    const maxFeePerTx = options?.maxFeePerTx;

    // Fetch and filter UTXOs when a provider is available
    let allUtxos: Utxo[] = [];
    if (this.hasProvider) {
      const address = await this.getFundingAddress();
      const raw = await providerFetchUtxos(this.config, address);
      // Remove dust and unusable UTXOs
      allUtxos = raw.filter((u) => u.satoshis > DUST_THRESHOLD);
      if (allUtxos.length === 0) {
        throw new MintCoreError(
          "Insufficient funds: no spendable UTXOs found (all UTXOs are below the dust threshold or the wallet is empty)"
        );
      }
      // Largest-first for greedy selection
      allUtxos.sort((a, b) => b.satoshis - a.satoshis);
    }

    const chunks: MintRequest[][] = [];
    for (let i = 0; i < requests.length; i += maxOutputs) {
      chunks.push(requests.slice(i, i + maxOutputs));
    }

    const transactions: PlannedTransaction[] = [];
    let totalEstimatedFee = 0;
    let totalCost = 0;

    // Track which UTXOs are already allocated to earlier chunks
    const planLock = new UtxoLock();

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const numTokenOutputs = chunk.length;

      let inputs: Utxo[] = [];
      let estimatedFee: number;
      let estimatedSize: number;
      let changeOutput: number;

      if (allUtxos.length > 0) {
        const unlocked = planLock.filterUnlocked(allUtxos);
        const result = this.selectForBatch(
          unlocked,
          numTokenOutputs,
          feeRate,
          safetyMargin
        );
        inputs = result.selected;
        estimatedFee = result.fee;
        estimatedSize = result.size;
        changeOutput = result.change;
        planLock.lockAll(inputs);
      } else {
        // Offline planning — estimate with a single input and one change output
        estimatedSize = estimateBatchTxSize(1, numTokenOutputs, 1);
        estimatedFee = estimateBatchTxFee(
          1,
          numTokenOutputs,
          1,
          feeRate,
          safetyMargin
        );
        changeOutput = 0;
      }

      if (maxFeePerTx !== undefined && estimatedFee > maxFeePerTx) {
        throw new MintCoreError(
          `Estimated fee for transaction ${idx} (${estimatedFee} sat) exceeds maxFeePerTx (${maxFeePerTx} sat)`
        );
      }

      const txCost = numTokenOutputs * TOKEN_OUTPUT_DUST + estimatedFee;
      totalEstimatedFee += estimatedFee;
      totalCost += txCost;

      transactions.push({
        index: idx,
        mintRequests: chunk,
        inputs,
        estimatedFee,
        estimatedSize,
        changeOutput,
        totalOutputValue: numTokenOutputs * TOKEN_OUTPUT_DUST + changeOutput,
      });
    }

    return {
      transactions,
      totalTransactions: transactions.length,
      totalMints: requests.length,
      totalEstimatedFee,
      totalCost,
      requiredBalance: totalCost,
    };
  }

  /**
   * Execute a `BatchMintPlan`: sign and broadcast every planned transaction.
   *
   * Transactions are executed **sequentially** in plan order. All UTXOs
   * referenced by the plan are locked before the first transaction is signed
   * and released (win or lose) after the last one completes.
   *
   * Before signing each transaction, the engine re-fetches UTXOs to verify
   * that the planned inputs are still unspent ("re-check before signing").
   *
   * @param plan    - The plan produced by {@link planMintBatch}.
   * @param options - Runtime overrides (e.g. `continueOnFailure`).
   * @returns A {@link MintExecutionResult} with txids, per-mint mappings,
   *          fee totals, and any failures.
   * @throws {MintCoreError} When no signer is configured or
   *         `continueOnFailure` is false and a transaction fails.
   */
  async executeMintBatch(
    plan: BatchMintPlan,
    options?: BatchMintOptions
  ): Promise<MintExecutionResult> {
    if (!this.config.privateKey && !this.config.walletProvider) {
      throw new MintCoreError(
        "No signing credentials configured. Provide `privateKey` or `walletProvider` in MintConfig."
      );
    }
    if (!this.hasProvider) {
      throw new MintCoreError(
        "Execution requires a UTXO provider. Set `utxoProviderUrl` or `electrumxProviderUrl` in MintConfig."
      );
    }

    const continueOnFailure = options?.continueOnFailure ?? false;

    const txids: string[] = [];
    const mintResults: MintExecutionResult["mintResults"] = [];
    const failures: MintExecutionResult["failures"] = [];
    let totalFeePaid = 0;

    // Reserve all planned UTXOs up-front to prevent double-spend
    for (const plannedTx of plan.transactions) {
      this.lock.lockAll(plannedTx.inputs);
    }

    try {
      for (const plannedTx of plan.transactions) {
        try {
          const { txid, fee } = await this.executeOnePlannedTx(plannedTx);
          txids.push(txid);
          totalFeePaid += fee;
          for (let i = 0; i < plannedTx.mintRequests.length; i++) {
            mintResults.push({
              request: plannedTx.mintRequests[i],
              txid,
              outputIndex: i,
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          failures.push({
            txIndex: plannedTx.index,
            error: msg,
            requests: plannedTx.mintRequests,
          });
          if (!continueOnFailure) {
            throw new MintCoreError(
              `Batch execution aborted at transaction ${plannedTx.index}: ${msg}`
            );
          }
        }
      }
    } finally {
      // Always release all UTXO locks, even after an error
      for (const plannedTx of plan.transactions) {
        this.lock.unlockAll(plannedTx.inputs);
      }
    }

    return { txids, mintResults, totalFeePaid, failures };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Build, sign, and broadcast a single planned transaction.
   *
   * Re-fetches live UTXOs before signing to verify that the planned inputs
   * are still available (concurrency re-check).
   */
  private async executeOnePlannedTx(
    plannedTx: PlannedTransaction
  ): Promise<{ txid: string; fee: number }> {
    const lockingBytecode = await this.getLockingBytecode();
    const address = await this.getFundingAddress();
    const freshUtxos = await providerFetchUtxos(this.config, address);

    // Re-check: verify every planned input is still unspent
    for (const planned of plannedTx.inputs) {
      const found = freshUtxos.find(
        (u) => u.txid === planned.txid && u.vout === planned.vout
      );
      if (!found) {
        throw new MintCoreError(
          `Planned UTXO ${planned.txid}:${planned.vout} is no longer available`
        );
      }
    }

    // Use planned inputs if they were assigned; otherwise select now
    let selected = plannedTx.inputs;
    if (selected.length === 0) {
      const feeRate = this.config.feeRate ?? DEFAULT_FEE_RATE;
      const available = this.lock
        .filterUnlocked(freshUtxos)
        .filter((u) => u.satoshis > DUST_THRESHOLD)
        .sort((a, b) => b.satoshis - a.satoshis);
      const result = this.selectForBatch(
        available,
        plannedTx.mintRequests.length,
        feeRate,
        0
      );
      selected = result.selected;
      this.lock.lockAll(selected);
    }

    // Sort deterministically by txid then vout (same UTXO set → same txid)
    const sortedInputs = [...selected].sort((a, b) => {
      if (a.txid < b.txid) return -1;
      if (a.txid > b.txid) return 1;
      return a.vout - b.vout;
    });

    // Derive the token category from the first input's outpoint
    const categoryHash = fromHex(sortedInputs[0].txid).reverse();

    // Build token outputs
    const outputs: RawTx["outputs"] = [];
    for (const req of plannedTx.mintRequests) {
      const recipientLocking = req.recipientAddress
        ? this.decodeAddressToLocking(req.recipientAddress)
        : lockingBytecode;
      outputs.push(this.buildMintOutput(req, recipientLocking, categoryHash));
    }

    // Change output
    const totalInput = sortedInputs.reduce((s, u) => s + u.satoshis, 0);
    const totalTokenDust = plannedTx.mintRequests.length * TOKEN_OUTPUT_DUST;
    const change = totalInput - totalTokenDust - plannedTx.estimatedFee;
    if (change > DUST_THRESHOLD) {
      outputs.push({ lockingBytecode, valueSatoshis: BigInt(change) });
    }

    const inputs: RawTx["inputs"] = sortedInputs.map((utxo) => ({
      outpointTransactionHash: fromHex(utxo.txid).reverse(),
      outpointIndex: utxo.vout,
      sequenceNumber: 0xffffffff,
      unlockingBytecode: new Uint8Array(0),
    }));

    const tx: RawTx = { version: 2, inputs, outputs, locktime: 0 };

    const signedHex = this.config.privateKey
      ? await this.signWithPrivateKey(tx, sortedInputs, lockingBytecode)
      : await this.signWithWallet(tx, sortedInputs, lockingBytecode);

    const txid = await providerBroadcast(this.config, signedHex);

    const actualFee =
      totalInput -
      totalTokenDust -
      (change > DUST_THRESHOLD ? change : 0);

    return { txid, fee: actualFee };
  }

  /**
   * Greedy UTXO selection for a single batch transaction chunk.
   *
   * Adds inputs largest-first until the total covers
   * `numTokenOutputs × TOKEN_OUTPUT_DUST + fee`.  The fee is recomputed each
   * time the input count grows so the estimate tracks the real transaction
   * size.
   */
  private selectForBatch(
    utxos: Utxo[],
    numTokenOutputs: number,
    feeRate: number,
    safetyMarginPct: number
  ): { selected: Utxo[]; fee: number; size: number; change: number } {
    if (utxos.length === 0) {
      throw new MintCoreError(
        "No UTXOs available. Please fund the wallet before minting."
      );
    }

    const sorted = [...utxos].sort((a, b) => b.satoshis - a.satoshis);
    const requiredDust = numTokenOutputs * TOKEN_OUTPUT_DUST;

    const selected: Utxo[] = [];
    let totalInput = 0;

    for (const utxo of sorted) {
      selected.push(utxo);
      totalInput += utxo.satoshis;

      // Estimate fee without change first to decide if we need a change output
      const feeNoChange = estimateBatchTxFee(
        selected.length,
        numTokenOutputs,
        0,
        feeRate,
        safetyMarginPct
      );
      const surplus = totalInput - requiredDust - feeNoChange;
      const numChangeOutputs = surplus > DUST_THRESHOLD ? 1 : 0;

      const fee = estimateBatchTxFee(
        selected.length,
        numTokenOutputs,
        numChangeOutputs,
        feeRate,
        safetyMarginPct
      );

      if (totalInput >= requiredDust + fee) {
        const change = totalInput - requiredDust - fee;
        const size = estimateBatchTxSize(
          selected.length,
          numTokenOutputs,
          numChangeOutputs
        );
        return {
          selected,
          fee,
          size,
          change: change > DUST_THRESHOLD ? change : 0,
        };
      }
    }

    throw new MintCoreError(
      `Insufficient funds: have ${totalInput} satoshis, ` +
        `need at least ${requiredDust} (dust) + fees for ${numTokenOutputs} outputs`
    );
  }

  /** Sign all inputs of `tx` using the configured private key. */
  private async signWithPrivateKey(
    tx: RawTx,
    selected: Utxo[],
    lockingBytecode: Uint8Array
  ): Promise<string> {
    const privKeyBin = fromHex(this.config.privateKey!);
    const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
    if (typeof pubKey === "string") {
      throw new MintCoreError(`Invalid private key: ${pubKey}`);
    }

    const sourceOutputs = selected.map((u) => ({
      lockingBytecode,
      valueSatoshis: BigInt(u.satoshis),
    }));

    try {
      for (let i = 0; i < tx.inputs.length; i++) {
        const context = { inputIndex: i, sourceOutputs, transaction: tx };
        const signingData = generateSigningSerializationBCH(context, {
          coveredBytecode: lockingBytecode,
          signingSerializationType: SIGHASH_ALL_FORKID,
        });
        const msgHash = hash256(signingData);
        const derSig = secp256k1.signMessageHashDER(privKeyBin, msgHash);
        if (typeof derSig === "string") {
          throw new MintCoreError(`Failed to sign input ${i}: ${derSig}`);
        }
        const sigWithHashType = new Uint8Array([
          ...derSig,
          SIGHASH_ALL_FORKID[0],
        ]);
        tx.inputs[i].unlockingBytecode = new Uint8Array([
          ...encodeDataPush(sigWithHashType),
          ...encodeDataPush(pubKey),
        ]);
      }
    } finally {
      privKeyBin.fill(0);
      pubKey.fill(0);
    }

    return toHex(encodeTransactionBCH(tx));
  }

  /** Hand the unsigned transaction to the configured wallet provider for signing. */
  private async signWithWallet(
    tx: RawTx,
    selected: Utxo[],
    lockingBytecode: Uint8Array
  ): Promise<string> {
    const unsignedHex = toHex(encodeTransactionBCH(tx));
    const sourceOutputs = selected.map((u) => ({
      satoshis: BigInt(u.satoshis),
      lockingBytecode,
    }));
    return this.config.walletProvider!.signTransaction(
      unsignedHex,
      sourceOutputs
    );
  }

  /** Build one token output for a single {@link MintRequest}. */
  private buildMintOutput(
    req: MintRequest,
    lockingBytecode: Uint8Array,
    category: Uint8Array
  ): RawTx["outputs"][number] {
    const capMap: Record<string, NonFungibleTokenCapability> = {
      none: NonFungibleTokenCapability.none,
      mutable: NonFungibleTokenCapability.mutable,
      minting: NonFungibleTokenCapability.minting,
    };

    const isNft =
      req.commitment !== undefined || req.capability !== "none";

    const tokenData: RawTx["outputs"][number]["token"] = {
      amount: req.amount,
      category,
      ...(isNft
        ? {
            nft: {
              capability: capMap[req.capability],
              commitment: req.commitment
                ? this.encodeCommitment(req.commitment)
                : new Uint8Array(0),
            },
          }
        : {}),
    };

    return {
      lockingBytecode,
      valueSatoshis: BigInt(TOKEN_OUTPUT_DUST),
      token: tokenData,
    };
  }

  /** Encode an NFT commitment string to bytes (hex or UTF-8). */
  private encodeCommitment(raw: string): Uint8Array {
    if (raw.startsWith("0x")) {
      return fromHex(raw.slice(2));
    }
    if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
      return fromHex(raw);
    }
    return new TextEncoder().encode(raw);
  }

  /** Decode a CashAddress to its P2PKH locking bytecode. */
  private decodeAddressToLocking(address: string): Uint8Array {
    const decoded = decodeCashAddress(address);
    if (typeof decoded === "string") {
      throw new MintCoreError(
        `Failed to decode recipient address "${address}": ${decoded}`
      );
    }
    if (decoded.type !== "p2pkh" && decoded.type !== "p2pkhWithTokens") {
      throw new MintCoreError(
        `Recipient address must be P2PKH, got type "${decoded.type}"`
      );
    }
    return encodeLockingBytecodeP2pkh(decoded.payload);
  }

  /** Return the P2PKH locking bytecode for the configured signer. */
  private async getLockingBytecode(): Promise<Uint8Array> {
    if (!this.config.privateKey && this.config.walletProvider) {
      const address = await this.config.walletProvider.getAddress();
      const decoded = decodeCashAddress(address);
      if (typeof decoded === "string") {
        throw new MintCoreError(
          `Failed to decode wallet address: ${decoded}`
        );
      }
      const expectedPrefix =
        CashAddressNetworkPrefix[this.config.network];
      if (decoded.prefix !== expectedPrefix) {
        throw new MintCoreError(
          `Wallet address network mismatch: expected prefix "${expectedPrefix}", got "${decoded.prefix}"`
        );
      }
      if (decoded.type !== "p2pkh" && decoded.type !== "p2pkhWithTokens") {
        throw new MintCoreError(
          `Wallet address must be a P2PKH address, got type "${decoded.type}"`
        );
      }
      return encodeLockingBytecodeP2pkh(decoded.payload);
    }
    const privKeyBin = fromHex(this.config.privateKey!);
    const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
    if (typeof pubKey === "string") {
      throw new MintCoreError(`Invalid private key: ${pubKey}`);
    }
    const pkh = hash160(pubKey);
    return encodeLockingBytecodeP2pkh(pkh);
  }

  /** Derive the CashAddress for the configured network and signer. */
  private async getFundingAddress(): Promise<string> {
    if (this.config.walletProvider && !this.config.privateKey) {
      return this.config.walletProvider.getAddress();
    }
    if (!this.config.privateKey) {
      throw new MintCoreError(
        "Cannot derive funding address: no private key or wallet provider configured."
      );
    }
    const privKeyBin = fromHex(this.config.privateKey);
    const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
    if (typeof pubKey === "string") {
      throw new MintCoreError(`Invalid private key: ${pubKey}`);
    }
    const pkh = hash160(pubKey);
    const locking = encodeLockingBytecodeP2pkh(pkh);
    const prefixMap: Record<string, CashAddressNetworkPrefix> = {
      mainnet: CashAddressNetworkPrefix.mainnet,
      testnet: CashAddressNetworkPrefix.testnet,
      regtest: CashAddressNetworkPrefix.regtest,
    };
    const prefix = prefixMap[this.config.network];
    if (!prefix) {
      throw new MintCoreError(
        `Unrecognized network: "${this.config.network}"`
      );
    }
    const result = lockingBytecodeToCashAddress(locking, prefix);
    if (typeof result !== "string") {
      throw new MintCoreError("Failed to derive CashAddress from private key");
    }
    return result;
  }
}
