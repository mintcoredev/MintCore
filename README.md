# MintCore

MintCore is a minimal, open‑source CashTokens minting engine built on top of `@bitauth/libauth`.  
It provides a clean, stable API for minting fungible tokens, NFTs, and minting‑capability NFTs on Bitcoin Cash.

MintCore is designed to be:
- Beginner‑friendly  
- Modular  
- Auditable  
- Production‑ready  

---

## Features

- ✔ Mint fungible CashTokens  
- ✔ Mint NFTs (capability + commitment)  
- ✔ Automatic token category creation  
- ✔ Real Libauth‑based transaction building  
- ✔ Real signing + serialization  
- ✔ BCH change output  
- ✔ Full schema validation  
- ✔ NFT commitment validation  
- ✔ Metadata size validation  
- ✔ Consistent MintCoreError error type  
- ✔ 27 tests (validation + transaction building)  
- ✔ ESM‑native TypeScript  

---

## Installation

```bash
npm install mintcore
```

---

## Quick Start

### Mint a fungible token

```typescript
import { MintEngine } from 'mintcore';

const engine = new MintEngine({
  network: 'mainnet',       // 'mainnet' | 'testnet' | 'regtest'
  privateKey: 'YOUR_PRIVATE_KEY_HEX',
});

const result = await engine.mint({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 2,
  initialSupply: 1000000n,
});

console.log(result.txid); // broadcast-ready transaction ID
console.log(result.hex);  // raw transaction hex
```

### Mint an NFT

```typescript
import { MintEngine } from 'mintcore';

const engine = new MintEngine({
  network: 'mainnet',
  privateKey: 'YOUR_PRIVATE_KEY_HEX',
});

const result = await engine.mint({
  name: 'My NFT',
  symbol: 'MNFT',
  decimals: 0,
  initialSupply: 0n,
  nft: {
    capability: 'minting',   // 'none' | 'mutable' | 'minting'
    commitment: '0x1234abcd', // hex (0x-prefixed or bare) or UTF-8 string, max 40 bytes
  },
});

console.log(result.txid);
```

### Validate a schema before minting

```typescript
import { validateSchema, MintCoreError } from 'mintcore';

try {
  validateSchema({
    name: 'My Token',
    symbol: 'MTK',
    decimals: 2,
    initialSupply: 1000000n,
  });
} catch (e) {
  if (e instanceof MintCoreError) {
    console.error('Validation failed:', e.message);
  }
}
```

---

## API Reference

### `MintEngine`

The primary entry point for minting.

```typescript
new MintEngine(config: MintConfig)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config.network` | `'mainnet' \| 'testnet' \| 'regtest'` | Target network |
| `config.privateKey` | `string` | 32-byte private key as hex |
| `config.feeRate` | `number` (optional) | Fee rate (reserved for future use) |

#### `engine.mint(schema: TokenSchema): Promise<MintResult>`

Validates the schema, builds, signs, and serializes the genesis transaction.

Returns a `MintResult`:

```typescript
{
  hex: string;                        // Raw transaction hex
  txid: string;                       // Transaction ID (64-char hex)
  metadata: Record<string, any> | null;
}
```

---

### `TokenSchema`

Describes the token to mint.

```typescript
interface TokenSchema {
  name: string;
  symbol: string;
  decimals: number;           // 0–18
  initialSupply: bigint;      // Must be >= 0n
  metadata?: Record<string, any>; // Max 1000 chars when serialised
  nft?: {
    capability: 'none' | 'mutable' | 'minting';
    commitment: string;       // Hex (0x-prefixed or bare) or UTF-8; max 40 bytes
  };
}
```

---

### `MintCoreError`

All errors thrown by MintCore are instances of `MintCoreError` for easy handling:

```typescript
import { MintCoreError } from 'mintcore';

try {
  await engine.mint(schema);
} catch (e) {
  if (e instanceof MintCoreError) {
    // MintCore-specific error (validation, signing, etc.)
  }
}
```

---

### `validateSchema(schema: TokenSchema): void`

Runs schema validation synchronously.  Throws `MintCoreError` if any rule is violated:

- `name` and `symbol` must be non-empty  
- `decimals` must be 0–18  
- `initialSupply` must be ≥ 0  
- NFT `capability` must be `'none'`, `'mutable'`, or `'minting'`  
- NFT commitment must be valid hex or UTF-8 and ≤ 40 bytes  
- `metadata` JSON serialization must be ≤ 1000 characters  

---

## Project Structure

```
src/
├── core/
│   ├── MintEngine.ts          # High-level mint API
│   ├── TransactionBuilder.ts  # Libauth transaction construction
│   └── MintResult.ts          # MintResult type
├── adapters/
│   └── LibauthAdapter.ts      # Bridges MintEngine ↔ TransactionBuilder
├── types/
│   ├── MintConfig.ts
│   ├── TokenSchema.ts
│   └── TransactionTypes.ts
└── utils/
    ├── errors.ts              # MintCoreError
    ├── validate.ts            # validateSchema
    ├── keys.ts
    └── hex.ts
tests/
├── TransactionBuilder.test.ts # 7 transaction-building tests
└── validate.test.ts           # 20 schema-validation tests
```

---

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

---

## Roadmap

- [ ] Chronik UTXO provider integration  
- [ ] ElectrumX UTXO provider integration  
- [ ] Dynamic fee estimation  
- [ ] Multi-UTXO selection  
- [ ] BCMR metadata attachment  

---

## License

MIT

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
