# CashMint Architecture

## Overview

CashMint is a full-stack TypeScript application providing a premium UI/UX layer on top of MintCore, the open-source CashTokens minting engine.

## Stack

| Layer    | Technology           |
|----------|----------------------|
| Backend  | Express + TypeScript |
| Frontend | React + Vite + TypeScript |
| Engine   | MintCore (npm package) |

## Directory Structure

```
cashmint/
  backend/   → Express REST API
  frontend/  → React SPA
  shared/    → Shared TypeScript types
  docs/      → Documentation
```

## API Endpoints

| Method | Path                    | Description                    |
|--------|-------------------------|--------------------------------|
| GET    | /api/health             | Service health + MintCore version |
| POST   | /api/mint               | Mint a fungible or NFT token   |
| GET    | /api/tokens             | List all minted tokens         |
| GET    | /api/tokens/:id         | Get token details              |
| POST   | /api/tokens/validate    | Validate token + metadata      |
| GET    | /api/wallets            | List known wallets             |
| GET    | /api/wallets/:address   | Wallet info (UTXOs, balances)  |

## MintCore Integration

The backend imports convenience wrappers from MintCore:

```ts
import { mintFungibleToken, mintNFT, verifyMint, createMetadata, encodeMetadata } from "mintcore";
```

> Currently, `mintcore.service.ts` uses placeholder logic. Real MintCore calls will be wired in during MVP 2.

## Roadmap

- **MVP 1** — Backend API + React frontend + MintCore placeholder integration ✅
- **MVP 2** — AI metadata generation, template system, user accounts
- **MVP 3** — Marketplace, premium features, analytics
