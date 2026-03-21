# Wallet Engine — Versioning Notes

Introduced in **MintCore v1.2.0**.

## Why the Version Was Bumped

MintCore v1.2.0 introduces the WalletConnect v2 engine as a new, self-contained wallet
subsystem. Because this adds new public exports (`WalletClient`, `WalletManager`, and
several types), a minor version increment is appropriate under Semantic Versioning: the
change is backward-compatible and additive only.

No existing public API was altered, removed, or renamed.

## What Changed in the Engine

The following modules were added under `src/wallet/`:

| Module            | Description                                                        |
|-------------------|--------------------------------------------------------------------|
| `WalletTypes.ts`  | Enumerations, constants, and interfaces for the wallet engine      |
| `WalletClient.ts` | Low-level WalletConnect v2 adapter; wraps a duck-typed SignClient  |
| `WalletManager.ts`| High-level lifecycle orchestrator with typed event emission        |
| `index.ts`        | Public re-export barrel for all wallet engine symbols              |

All wallet engine symbols are re-exported from the top-level `src/index.ts` and therefore
available via the standard package entry point.

## Backward Compatibility

All changes are strictly additive:

- No existing export was removed.
- No existing export was renamed.
- No existing type was changed.
- No existing behaviour was altered.

Consumers upgrading from v1.1.x or earlier can adopt v1.2.0 without any modifications
to their existing code.

## Deprecated Symbols

None. No symbols were deprecated in this release.

## Migration Notes for Consumers

### Adopting the Wallet Engine

The wallet engine does not auto-initialise. Consumers must:

1. Create a WalletConnect v2 `SignClient` instance using the `@walletconnect/sign-client`
   package (not included in MintCore).
2. Handle the pairing and approval flow in their application layer.
3. Pass the approved session to `WalletManager.connect()`.

Minimal integration outline:

```typescript
import { WalletManager, WalletType } from "mintcore";

const manager = new WalletManager();

// After your application has obtained an approved WalletConnect session:
const session = await manager.connect(signClient, approvedSession, WalletType.Paytaca);

const address = await manager.getAddress();
const signedTx = await manager.signTransaction(rawTxHex, sourceOutputs);
```

### No UI Provided

The wallet engine does not include a QR code modal, connection dialog, or any other UI
element. If your application requires a visual pairing flow, you must implement or
integrate a UI component separately. The engine exposes only the typed API surface
described in [`/docs/api/wallet.md`](../api/wallet.md).

### Choosing a Chain ID

Pass the appropriate `BCH_CHAIN_IDS` constant as the `chainId` argument to
`WalletManager.connect()` when targeting testnet or regtest:

```typescript
import { WalletManager, WalletType, BCH_CHAIN_IDS } from "mintcore";

const manager = new WalletManager();
await manager.connect(signClient, session, WalletType.Cashonize, BCH_CHAIN_IDS.testnet);
```

If `chainId` is omitted it defaults to `bch:bitcoincash` (mainnet).
