# Batch Minting

> Efficiently mint large numbers of CashTokens outputs across multiple optimized
> transactions using the `BatchMintEngine`.

---

## Overview

Single-output minting works well for one-off token genesis events, but creating
hundreds or thousands of token outputs one at a time is slow and expensive.
MintCore's batch-minting engine solves this by:

1. **Planning** — grouping mint requests into transactions that respect size and
   fee limits, selecting UTXOs, and returning a detailed cost summary before a
   single byte is signed.
2. **Executing** — signing and broadcasting each planned transaction in order,
   mapping every mint request back to its resulting `txid` and output index.

---

## Why Planning Matters

The planning phase (`planMintBatch`) is **deterministic and pure** — it touches
no network state when a UTXO provider is not configured, and produces the same
plan for the same inputs every time. This lets you:

- Show a fee preview to the user before they confirm.
- Validate that the wallet has enough BCH before committing.
- Adjust `maxOutputsPerTx` or `maxFeePerTx` in a UI without side-effects.
- Store or cache the plan and execute it later.

---

## UTXO Strategy

When a UTXO provider is configured, `planMintBatch` fetches all spendable UTXOs
for the funding address, filters out dust (satoshis ≤ `DUST_THRESHOLD` = 546),
and applies a **greedy largest-first** selection algorithm:

1. Sort available UTXOs from largest to smallest.
2. Add UTXOs one at a time until the total covers  
   `numTokenOutputs × TOKEN_OUTPUT_DUST + estimatedFee`.
3. If a change output is warranted (surplus > `DUST_THRESHOLD`), include it in
   the fee estimate.
4. **Lock** selected UTXOs immediately so subsequent chunks in the same batch
   cannot select them again — preventing double-spend within the plan.
5. After execution, all locks are released regardless of success or failure.

If no UTXO provider is configured, the planner works in **offline mode**:
UTXOs are not assigned but fee and size estimates are still computed (using a
1-input assumption), enabling cost previews without network access.

---

## Fee Modeling

Each batch transaction's fee is estimated with `estimateBatchTxFee`:

```
size = TX_OVERHEAD
     + numInputs × P2PKH_INPUT_SIZE        (148 bytes each)
     + numTokenOutputs × (P2PKH_OUTPUT_SIZE + TOKEN_PREFIX_OVERHEAD)  (84 bytes each)
     + numChangeOutputs × P2PKH_OUTPUT_SIZE (34 bytes each)
     + (hasMintingBaton ? MINTING_BATON_INPUT_OVERHEAD : 0)  (41 bytes)

fee = ceil(size × feeRate) × (1 + safetyMarginPercent / 100)
```

| Constant | Value | Meaning |
|----------|-------|---------|
| `TX_OVERHEAD` | 10 B | version + input/output count varints + locktime |
| `P2PKH_INPUT_SIZE` | 148 B | standard P2PKH unlocking script |
| `P2PKH_OUTPUT_SIZE` | 34 B | standard P2PKH locking script + value |
| `TOKEN_PREFIX_OVERHEAD` | 50 B | CashTokens category + capability + amount |
| `MINTING_BATON_INPUT_OVERHEAD` | 41 B | extra overhead for minting-baton inputs |
| `TOKEN_OUTPUT_DUST` | 1000 sat | minimum value for a token-bearing output |
| `DUST_THRESHOLD` | 546 sat | minimum change output value |

The default `feeSafetyMarginPercent` is **10 %** — enough to absorb small
estimation errors while keeping fees reasonable.

---

## API Reference

### `planMintBatch(requests, options?): Promise<BatchMintPlan>`

Plans a batch of mint operations without executing anything.

```typescript
import { BatchMintEngine } from "mintcore";
import type { MintRequest, BatchMintOptions } from "mintcore";

const engine = new BatchMintEngine({
  network: "mainnet",
  privateKey: "YOUR_32_BYTE_HEX_KEY",
  utxoProviderUrl: "https://chronik.be.cash/bch",
});

const requests: MintRequest[] = Array.from({ length: 100 }, () => ({
  capability: "none",
  amount: 1000n,
}));

const options: BatchMintOptions = {
  maxOutputsPerTx: 20,      // at most 20 token outputs per transaction
  feeRate: 1.0,             // sat/byte
  feeSafetyMarginPercent: 10,
};

const plan = await engine.planMintBatch(requests, options);

console.log(`Transactions planned : ${plan.totalTransactions}`);
console.log(`Total mints          : ${plan.totalMints}`);
console.log(`Estimated fees       : ${plan.totalEstimatedFee} sat`);
console.log(`Required balance     : ${plan.requiredBalance} sat`);
```

### `executeMintBatch(plan, options?): Promise<MintExecutionResult>`

Signs and broadcasts all planned transactions in order.

```typescript
const result = await engine.executeMintBatch(plan, {
  continueOnFailure: false, // abort on first error (default)
});

console.log("Broadcast txids:", result.txids);
console.log("Total fee paid :", result.totalFeePaid, "sat");

for (const { request, txid, outputIndex } of result.mintResults) {
  console.log(`Output ${outputIndex} in ${txid}: ${request.amount} tokens`);
}

if (result.failures.length > 0) {
  console.error("Failures:", result.failures);
}
```

---

## BatchMintOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxOutputsPerTx` | `number` | `20` | Maximum token outputs per transaction (1–1000) |
| `maxFeePerTx` | `number` | unlimited | Hard fee cap in satoshis; planning throws if exceeded |
| `feeRate` | `number` | `1.0` | Fee rate in sat/byte |
| `feeSafetyMarginPercent` | `number` | `10` | Extra margin on fee estimates (0–100 %) |
| `continueOnFailure` | `boolean` | `false` | Keep going after a single transaction failure |

---

## MintRequest Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `capability` | `"none" \| "mutable" \| "minting"` | ✅ | NFT capability |
| `amount` | `bigint` | ✅ | Fungible token amount (`0n` for pure NFTs) |
| `category` | `string` | ❌ | 64-hex token category (auto-derived when omitted) |
| `commitment` | `string` | ❌ | NFT commitment ≤ 40 bytes (hex or UTF-8) |
| `recipientAddress` | `string` | ❌ | CashAddress recipient (defaults to funding address) |

---

## Examples

### Example 1 — Mint 10 fungible tokens

```typescript
const engine = new BatchMintEngine({
  network: "mainnet",
  privateKey: "...",
  utxoProviderUrl: "https://chronik.be.cash/bch",
});

const requests: MintRequest[] = Array.from({ length: 10 }, () => ({
  capability: "none" as const,
  amount: 100_000n,
}));

const plan = await engine.planMintBatch(requests);
// All 10 fit in one transaction (default maxOutputsPerTx = 20)
console.log(plan.totalTransactions); // 1

const result = await engine.executeMintBatch(plan);
console.log(result.txids); // ["<txid>"]
```

### Example 2 — Mint 1,000 NFTs

```typescript
const nftRequests: MintRequest[] = Array.from({ length: 1_000 }, (_, i) => ({
  capability: "none" as const,
  amount: 0n,
  commitment: Buffer.from(`NFT #${i}`).toString("hex"),
}));

const plan = await engine.planMintBatch(nftRequests, {
  maxOutputsPerTx: 20,   // 50 transactions of 20 NFTs each
  feeSafetyMarginPercent: 15,
});

console.log(plan.totalTransactions);  // 50
console.log(plan.totalEstimatedFee);  // ~total fee in sat

const result = await engine.executeMintBatch(plan, {
  continueOnFailure: true, // don't abort the whole batch on one failure
});

console.log(`${result.txids.length} transactions broadcast`);
console.log(`${result.failures.length} failed`);
```

### Example 3 — Offline fee preview (no UTXO provider)

```typescript
const engine = new BatchMintEngine({
  network: "mainnet",
  privateKey: "...",
  // No utxoProviderUrl → offline planning
});

const requests = Array.from({ length: 500 }, () => ({
  capability: "none" as const,
  amount: 1n,
}));

const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 25 });
// plan.transactions[*].inputs will be empty (offline mode)
// fee estimates are still available:
console.log(`~${plan.totalEstimatedFee} sat to mint 500 tokens`);
console.log(`~${plan.totalTransactions} transactions required`);
```

---

## Error Handling

| Error | Cause |
|-------|-------|
| `At least one MintRequest is required` | Empty `requests` array |
| `Invalid token category: "…"` | `category` is not a 64-hex string |
| `Invalid mint capability: "…"` | `capability` is not one of the allowed values |
| `Mint amount must be non-negative` | `amount < 0n` |
| `NFT commitment too long` | `commitment` exceeds 40 bytes |
| `Invalid recipient address format` | `recipientAddress` fails the CashAddress pattern check |
| `maxOutputsPerTx must be an integer between 1 and 1000` | Out-of-range planning option |
| `Estimated fee … exceeds maxFeePerTx` | Fee cap too tight for the chunk size |
| `Insufficient funds: no spendable UTXOs found` | All UTXOs are below dust threshold |
| `Insufficient funds: have … satoshis` | UTXOs do not cover outputs + fees |
| `No signing credentials configured` | Neither `privateKey` nor `walletProvider` set |
| `Execution requires a UTXO provider` | `executeMintBatch` called without a provider |
| `Planned UTXO … is no longer available` | UTXO was spent between planning and signing |
| `Batch execution aborted at transaction N: …` | A transaction failed with `continueOnFailure: false` |

---

## Concurrency Safety

`BatchMintEngine` uses an internal `UtxoLock` registry to prevent the same UTXO
from being selected by two chunks in the same batch.  Locks are:

- **Acquired** for all planned inputs before the first transaction is signed.
- **Held** for the duration of execution.
- **Released** unconditionally in a `finally` block — even after an error.

Two separate `BatchMintEngine` instances do **not** share a lock registry. If
you run two engines simultaneously against the same wallet address, you risk
UTXO conflicts. For parallel use, either shard the UTXO set explicitly or
serialize engine executions.

---

## TypeScript Types

```typescript
import type {
  MintRequest,
  BatchMintOptions,
  BatchMintPlan,
  PlannedTransaction,
  MintExecutionResult,
} from "mintcore";
```

All types are fully documented with JSDoc and included in the published
`dist/api/mintcore.d.ts` type declaration.
