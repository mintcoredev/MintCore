# MintCore

MintCore is a minimal, open-source CashTokens minting library for Bitcoin Cash.
It provides simple functions to mint and verify tokens, built on top of Libauth.

## Features

- Mint fungible tokens (FTs)
- Mint non-fungible tokens (NFTs)
- Verify token transactions
- Encode and decode token metadata
- Estimate transaction fees
- Extract token IDs from transactions

## Installation

```bash
npm install mintcore
```

## Quick Start

```typescript
import { mintFungibleToken, verifyMint } from 'mintcore';

// Mint a fungible token
const tx = mintFungibleToken({
  // configuration
});

// Verify the mint transaction
const isValid = verifyMint(tx);
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a pull request.