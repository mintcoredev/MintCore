# Transaction Builder

**Source:** `src/core/TransactionBuilder.ts`  
**Exported from:** `"mintcore"`

The `TransactionBuilder` constructs and signs CashTokens genesis transactions. It handles UTXO selection, fee estimation, token prefix encoding, and optional BCMR OP_RETURN output attachment.

---

## `TransactionBuilder`

```ts
class TransactionBuilder {
  constructor(config: MintConfig)
  build(schema: TokenSchema): Promise<BuiltTransaction>
  broadcast(txHex: string): Promise<string>
}
```

### Constructor

```ts
new TransactionBuilder(config: MintConfig)
```

Creates a `TransactionBuilder` for the given configuration. A UTXO provider URL is required to fund and broadcast transactions; without one the builder operates in offline mode (returns an unsigned skeleton).

---

### `build(schema)`

```ts
async build(schema: TokenSchema): Promise<BuiltTransaction>
```

Build and sign a genesis transaction for the given token schema.

- Validates `config.privateKey` and derives the signing address.
- If a provider is configured, fetches UTXOs, selects inputs, and builds a funded, signed transaction.
- If no provider is configured, returns an offline skeleton without inputs.
- Attaches a BCMR OP_RETURN output when `schema.bcmrUri` is set.
- When both `schema.bcmrUri` and `schema.bcmrHash` are set, emits `OP_RETURN BCMR <hash> <uri>` (hash-pinned authchain).

**Throws** `MintCoreError` when:
- `privateKey` is absent or malformed.
- The derived address cannot be decoded.
- The schema fails validation.
- UTXO fetching or signing fails.

---

### `broadcast(txHex)`

```ts
async broadcast(txHex: string): Promise<string>
```

Broadcast a fully-signed raw transaction via the configured UTXO provider.

**Returns** the resulting transaction ID returned by the network.

**Throws** `MintCoreError` when no provider is configured or the broadcast fails.

---

## Supporting Types

### `MintConfig`

```ts
interface MintConfig {
  /** BCH network to target. */
  network: "mainnet" | "testnet" | "regtest";
  /**
   * Raw 32-byte private key as a lowercase hex string.
   * Used to derive the signing address and sign inputs.
   */
  privateKey?: string;
  /**
   * Base URL of a Chronik instance used to fetch UTXOs and broadcast.
   * When both provider URLs are set, this takes precedence.
   */
  utxoProviderUrl?: string;
  /**
   * Base URL of an ElectrumX / Fulcrum HTTP REST endpoint.
   * Used as a fallback when `utxoProviderUrl` is not configured.
   */
  electrumxProviderUrl?: string;
  /** Fee rate in satoshis per byte (default: 1.0). */
  feeRate?: number;
}
```

---

### `TokenSchema`

```ts
interface TokenSchema {
  /** Human-readable token name. */
  name: string;
  /** Ticker symbol. */
  symbol: string;
  /** Number of decimal places (0–18). */
  decimals: number;
  /** Number of fungible units to mint. */
  initialSupply: bigint;
  /** Optional arbitrary key-value metadata. */
  metadata?: Record<string, unknown>;
  /** Optional NFT capability and commitment. */
  nft?: NftOptions;
  /** Optional BCMR metadata URI (IPFS CID or HTTPS URL). */
  bcmrUri?: string;
  /**
   * Optional 64-hex-char SHA-256 hash of the BCMR document.
   * When set with `bcmrUri`, produces a hash-pinned OP_RETURN authchain entry.
   */
  bcmrHash?: string;
}
```

---

### `NftOptions`

```ts
interface NftOptions {
  capability: "none" | "mutable" | "minting";
  /** Hex or UTF-8 encoded commitment (up to 40 bytes). */
  commitment: string;
}
```

---

### `BuiltTransaction`

```ts
interface BuiltTransaction {
  /** Fully-signed raw transaction as a lowercase hex string. */
  hex: string;
  /** Transaction ID (display order). */
  txid: string;
}
```

---

## Example

```ts
import { TransactionBuilder } from "mintcore";

const builder = new TransactionBuilder({
  network: "mainnet",
  privateKey: "your32byteprivatekeyhex",
  utxoProviderUrl: "https://chronik.be.cash/bch",
});

const result = await builder.build({
  name: "Gold",
  symbol: "GOLD",
  decimals: 2,
  initialSupply: 1_000_000n,
  bcmrUri: "https://example.com/gold.json",
});

// result.hex  — signed transaction hex ready to broadcast
// result.txid — transaction id

await builder.broadcast(result.hex);
```

---

## Fee Estimation Constants

```ts
import {
  P2PKH_INPUT_SIZE,      // 148 bytes
  P2PKH_OUTPUT_SIZE,     // 34 bytes
  TOKEN_PREFIX_OVERHEAD, // 50 bytes
  TOKEN_OUTPUT_DUST,     // 1000 satoshis
  DUST_THRESHOLD,        // 546 satoshis
  DEFAULT_FEE_RATE,      // 1.0 sat/byte
} from "mintcore";
```

Use `estimateFee(inputs, outputs, feeRate, hasToken)` to compute a fee estimate in satoshis for a single mint transaction without constructing one.
