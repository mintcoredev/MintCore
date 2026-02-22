MintCore

MintCore is a minimal, open‑source CashTokens minting engine built on top of @bitauth/libauth.  
It provides a clean, stable API for minting:

- Fungible tokens  
- NFTs  
- Minting‑capability NFTs  

MintCore is designed to be:

- Beginner‑friendly  
- Modular  
- Auditable  
- Production‑ready  

---

🚀 Features

- ✔ Mint fungible CashTokens  
- ✔ Mint NFTs (capability + commitment)  
- ✔ Automatic token category creation  
- ✔ Real Libauth‑based transaction building  
- ✔ Signing + serialization  
- ✔ BCH change output  
- ✔ Full schema validation  
- ✔ NFT commitment validation  
- ✔ Metadata size validation  
- ✔ Consistent MintCoreError type  
- ✔ 37 tests (validation + transaction building + providers)  
- ✔ ESM‑native TypeScript  
- ✔ Chronik UTXO provider  
- ✔ ElectrumX / Fulcrum UTXO provider  

---

📦 Installation

`bash
npm install mintcore
`

---

⚡ Quick Start

Mint a fungible token

`typescript
import { MintEngine } from 'mintcore';

const engine = new MintEngine({
  network: 'mainnet',
  privateKey: 'YOURPRIVATEKEY_HEX',
});

const result = await engine.mint({
  name: 'My Token',
  symbol: 'MTK',
  decimals: 2,
  initialSupply: 1000000n,
});

console.log(result.txid);
console.log(result.hex);
`

---

Mint an NFT

`typescript
import { MintEngine } from 'mintcore';

const engine = new MintEngine({
  network: 'mainnet',
  privateKey: 'YOURPRIVATEKEY_HEX',
});

const result = await engine.mint({
  name: 'My NFT',
  symbol: 'MNFT',
  decimals: 0,
  initialSupply: 0n,
  nft: {
    capability: 'minting',
    commitment: '0x1234abcd',
  },
});

console.log(result.txid);
`

---

Validate a schema before minting

`typescript
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
`

---

📘 API Reference

MintEngine

`typescript
new MintEngine(config: MintConfig)
`

| Parameter | Type | Description |
|----------|------|-------------|
| config.network | 'mainnet' | 'testnet' | 'regtest' | Target network |
| config.privateKey | string | 32‑byte hex private key |
| config.feeRate | number (optional) | Reserved for future use |

engine.mint(schema: TokenSchema): Promise<MintResult>

Builds, signs, and serializes the genesis transaction.

Returns:

`typescript
{
  hex: string;
  txid: string;
  metadata: Record<string, any> | null;
}
`

---

TokenSchema

`typescript
interface TokenSchema {
  name: string;
  symbol: string;
  decimals: number;           // 0–18
  initialSupply: bigint;      // >= 0n
  metadata?: Record<string, any>; // Max 1000 chars
  nft?: {
    capability: 'none' | 'mutable' | 'minting';
    commitment: string;       // Hex or UTF‑8, max 40 bytes
  };
}
`

---

MintCoreError

All MintCore errors extend MintCoreError:

`typescript
import { MintCoreError } from 'mintcore';

try {
  await engine.mint(schema);
} catch (e) {
  if (e instanceof MintCoreError) {
    // Handle MintCore-specific error
  }
}
`

---

validateSchema(schema: TokenSchema): void

Throws MintCoreError if:

- name or symbol is empty  
- decimals is outside 0–18  
- initialSupply < 0  
- NFT capability is invalid  
- NFT commitment is invalid or > 40 bytes  
- Metadata JSON > 1000 chars  

---

🗂 Project Structure

`
src/
├── core/
│   ├── MintEngine.ts
│   ├── TransactionBuilder.ts
│   └── MintResult.ts
├── adapters/
│   └── LibauthAdapter.ts
├── providers/
│   ├── ChronikProvider.ts
│   └── ElectrumXProvider.ts
├── types/
│   ├── MintConfig.ts
│   ├── TokenSchema.ts
│   └── TransactionTypes.ts
└── utils/
    ├── errors.ts
    ├── validate.ts
    ├── keys.ts
    └── hex.ts
tests/
├── TransactionBuilder.test.ts
├── ElectrumXProvider.test.ts
└── validate.test.ts
`

---

🛠 Development

`bash
npm install
npm run build
npm test
`

---

🧭 Roadmap

- [x] Chronik UTXO provider  
- [x] ElectrumX UTXO provider  
- [ ] Dynamic fee estimation  
- [ ] Multi‑UTXO selection  
- [ ] BCMR metadata attachment  

---

📄 License

MIT

---

🤝 Contributing

Contributions are welcome!  
Please open an issue or submit a pull request.

---

If you want, I can also generate:

- A badge header  
- A logo  
- A CHANGELOG  
- A CONTRIBUTING guide  
- An npm‑optimized version of the README
