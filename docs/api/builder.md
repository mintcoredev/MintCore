# API Reference — Transaction Builder (`src/core/TransactionBuilder.ts`)

Assembles, signs, and serialises CashTokens genesis transactions.

---

## Type Definitions

`TransactionBuilder` consumes types from the shared `src/types/` barrel:

```ts
import type { MintConfig } from "mintcore";      // SDK configuration
import type { TokenSchema } from "mintcore";     // Token mint parameters
import type { BuiltTransaction } from "mintcore"; // Build result
```

### `MintConfig`

```ts
interface MintConfig {
  network: "mainnet" | "testnet" | "regtest";
  privateKey: string;            // 32-byte private key as hex
  utxoProviderUrl?: string;      // Chronik node URL
  electrumxProviderUrl?: string; // ElectrumX / Fulcrum HTTP REST URL
  feeRate?: number;              // sat/byte, default 1.0
}
```

### `TokenSchema`

```ts
interface TokenSchema {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  metadata?: Record<string, unknown>;
  nft?: {
    capability: "none" | "mutable" | "minting";
    commitment: string; // hex or UTF-8 encoded string
  };
  bcmrUri?: string;   // IPFS CID or URL to a BCMR JSON file
  bcmrHash?: string;  // 64-char hex SHA-256 hash of the BCMR document
}
```

### `BuiltTransaction`

```ts
interface BuiltTransaction {
  hex: string;    // serialised signed transaction hex
  rawHex: string; // alias for hex
  txid: string;   // transaction id (display byte order)
}
```

---

## Class: `TransactionBuilder`

```ts
class TransactionBuilder {
  constructor(config: MintConfig)

  /** Build and sign a CashTokens genesis transaction. */
  async build(schema: TokenSchema): Promise<BuiltTransaction>

  /** Broadcast a signed transaction via the configured provider. */
  async broadcast(txHex: string): Promise<string>
}
```

### `constructor(config: MintConfig)`

Creates a new builder instance. Requires `MintConfig.privateKey`. When neither `utxoProviderUrl` nor `electrumxProviderUrl` is set, `build()` operates in offline mode using a zero outpoint.

### `build(schema: TokenSchema): Promise<BuiltTransaction>`

Assembles and signs a CashTokens genesis transaction:

1. Validates `privateKey` format.
2. Derives the P2PKH address from the private key.
3. If a provider is configured: fetches UTXOs, selects funding inputs, estimates fees, and builds a fully-funded signed transaction.
4. If no provider is configured: builds an offline transaction with a zero outpoint (useful for testing and pre-signing).
5. Optionally appends a BCMR `OP_RETURN` output when `schema.bcmrUri` is set.

Throws `MintCoreError` on validation failures or when the wallet has insufficient funds.

### `broadcast(txHex: string): Promise<string>`

Broadcasts a fully-signed transaction hex to the network via the configured Chronik or ElectrumX provider. Returns the broadcast transaction id.

Throws `MintCoreError` when no provider is configured or the broadcast fails.

---

## Usage Examples

```ts
import { TransactionBuilder } from "mintcore";

const builder = new TransactionBuilder({
  network: "mainnet",
  privateKey: "your32byteprivatekeyhex",
  utxoProviderUrl: "https://chronik.be.cash/bch",
});

// Build a fungible token genesis transaction
const tx = await builder.build({
  name: "Gold",
  symbol: "GOLD",
  decimals: 2,
  initialSupply: 1_000_000n,
});

console.log(tx.txid); // broadcast txid
console.log(tx.hex);  // signed hex — pass to builder.broadcast() or your own provider

// Broadcast the signed transaction
const txid = await builder.broadcast(tx.hex);

// Offline mode — no provider URL needed
const offlineBuilder = new TransactionBuilder({
  network: "mainnet",
  privateKey: "your32byteprivatekeyhex",
});

const offlineTx = await offlineBuilder.build({
  name: "TestToken",
  symbol: "TEST",
  decimals: 0,
  initialSupply: 100n,
  nft: { capability: "minting", commitment: "0xdead" },
});
console.log(offlineTx.hex); // unsigned zero-outpoint transaction hex
```
