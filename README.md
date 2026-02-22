📦 MintCore — TypeScript SDK for Bitcoin Cash CashTokens

MintCore is a fully‑featured, production‑ready TypeScript SDK for building, minting, signing, and broadcasting CashTokens transactions on Bitcoin Cash.  
It provides a clean, modular architecture with multiple UTXO providers, wallet integration, BCMR metadata support, and a fully tested transaction builder.

MintCore powers CashMint, but is open‑source so developers can build their own tools, wallets, and platforms on top of it.

---

🚀 Features

✔ Full CashTokens Genesis Builder
- Fungible tokens (FT)
- Non‑fungible tokens (NFT) with:
  - none
  - mutable
  - minting capabilities
- Deterministic category generation
- Offline or funded modes

✔ BCMR Metadata Support
- Optional bcmrUri field in TokenSchema
- Automatic OP_RETURN metadata output
- URI validation (empty/oversized rejection)

✔ Multi‑Backend UTXO Providers
- ChronikProvider
  - Fetch UTXOs
  - Broadcast transactions
- ElectrumXProvider
  - Fetch UTXOs
  - Broadcast transactions

✔ Wallet Integration
MintCore supports external wallets via:

`ts
interface WalletProvider {
  getAddress(): Promise<string>;
  signTransaction(txHex: string, sourceOutputs: any[]): Promise<string>;
}
`

Use:
- Browser wallets  
- Mobile wallets  
- Hardware wallets  
- Custom signing backends  

✔ Private Key Mode (Optional)
MintCore can also sign transactions directly using a raw private key.

✔ Dynamic Fee Estimation
- Accurate byte‑level fee calculation
- P2PKH input/output sizing
- CashTokens overhead
- Configurable fee rate (default: 1 sat/byte)

✔ Multi‑UTXO Coin Selection
- Greedy largest‑first algorithm
- Recalculates fees as inputs grow
- Dust‑safe change handling
- Throws on insufficient funds

✔ Fully Tested
- 62 tests
- Covers:
  - validation  
  - transaction building  
  - fee estimation  
  - coin selection  
  - BCMR  
  - wallet signing  
  - broadcasting  
  - Chronik + ElectrumX  

✔ Zero CodeQL Alerts
Security‑clean and production‑safe.

---

📚 Installation

`bash
npm install mintcore
`

---

🧩 Usage

1. Basic Minting (Private Key Mode)

`ts
import { MintEngine } from "mintcore";

const engine = new MintEngine({
  network: "mainnet",
  privateKey: "your-private-key-hex",
  utxoProviderUrl: "https://chronik.yourdomain.com",
});

const result = await engine.mint({
  name: "MyToken",
  ticker: "MTK",
  initialSupply: 1000n,
});

console.log(result.txid);
`

---

2. Wallet‑Signed Minting

`ts
const engine = new MintEngine({
  network: "mainnet",
  walletProvider: myWallet,
  electrumxProviderUrl: "https://fulcrum.example.com",
});

const result = await engine.mint({
  name: "ArtToken",
  nft: {
    capability: "minting",
    commitment: "0x1234abcd",
  },
  bcmrUri: "https://example.com/bcmr.json",
});
`

---

🧱 Architecture Overview

`
src/
 ├─ core/
 │   ├─ MintEngine.ts
 │   ├─ TransactionBuilder.ts
 │   └─ ...
 ├─ providers/
 │   ├─ ChronikProvider.ts
 │   ├─ ElectrumXProvider.ts
 │   └─ WalletProvider.ts
 ├─ utils/
 │   ├─ fee.ts
 │   ├─ coinselect.ts
 │   ├─ hex.ts
 │   └─ errors.ts
 ├─ types/
 │   ├─ MintConfig.ts
 │   ├─ TokenSchema.ts
 │   └─ TransactionTypes.ts
`

MintCore is designed to be:

- modular  
- testable  
- extensible  
- wallet‑agnostic  
- backend‑agnostic  

---

🛣 Roadmap

Completed
- [x] Chronik UTXO provider  
- [x] ElectrumX UTXO provider  
- [x] Fee estimation  
- [x] Coin selection  
- [x] BCMR metadata  
- [x] Wallet provider interface  
- [x] Broadcast support  
- [x] 62‑test suite  
- [x] Offline + funded builders  

Upcoming
- [ ] Token minting (post‑genesis)  
- [ ] Token melting  
- [ ] Multi‑sig support  
- [ ] SLP → CashTokens migration helpers  
- [ ] CLI tools  
- [ ] Browser‑optimized build  

---

🛡 Security

MintCore is continuously scanned with CodeQL.  
Current status: 0 alerts.

---

📄 License

MIT — free to use in commercial and open‑source projects.

---

❤️ Contributing

PRs welcome!  
MintCore aims to become the standard CashTokens SDK for the BCH ecosystem.
