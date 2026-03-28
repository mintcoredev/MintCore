# Wallet Engine — Versioning Notes

## v0.4.0 — WizardConnect Removal

### Why the Version Was Bumped

MintCore removes all WizardConnect-related code, types, providers, adapters, and
utilities. The SDK is now clean of WizardConnect and ready for WalletConnect v2
integration.

### What Changed

#### Removed

| Symbol                      | Reason                                               |
|-----------------------------|------------------------------------------------------|
| `WizardConnectProvider`     | Removed — no replacement yet (WalletConnect v2 TBD) |
| `WizardConnectProviderOptions` | Removed with `WizardConnectProvider`             |
| `WizardConnectClientLike`   | Renamed to `BchWalletClientLike`                    |
| `WizardConnectSession`      | Renamed to `BchWalletSession`                       |
| `WizardAdapter`             | Renamed to `BaseWalletAdapter`                      |
| `WizardAdapterClientLike`   | Renamed to `WalletAdapterClientLike`                |

#### Added / Renamed

| Symbol                  | Description                                              |
|-------------------------|----------------------------------------------------------|
| `BchWalletClientLike`   | Generic duck-typed BCH wallet client interface           |
| `BchWalletSession`      | Generic session descriptor (was `WizardConnectSession`)  |
| `BaseWalletAdapter`     | Base `WalletAdapter` implementation (was `WizardAdapter`)|
| `WalletAdapterClientLike` | Generic adapter client interface                       |

### Migration Notes for Consumers

#### Updating imports

```typescript
// Before
import { WizardConnectProvider } from "mintcore";
import type { WizardConnectClientLike, WizardConnectSession } from "mintcore";
import { WizardAdapter } from "mintcore";
import type { WizardAdapterClientLike } from "mintcore";

// After
import type { BchWalletClientLike, BchWalletSession } from "mintcore";
import { BaseWalletAdapter } from "mintcore";
import type { WalletAdapterClientLike } from "mintcore";
```

#### Replacing `WizardConnectProvider`

`WizardConnectProvider` has been removed. If you were using it with `TransactionBuilder`,
you will need to wait for the upcoming WalletConnect v2 provider or supply your own
`WalletProvider` implementation in the meantime.

#### Replacing `WizardAdapter`

```typescript
// Before
import { WizardAdapter } from "mintcore";
const adapter = new WizardAdapter({ client });

// After
import { BaseWalletAdapter } from "mintcore";
const adapter = new BaseWalletAdapter({ client });
```

The constructor signature and all methods are identical.

#### Wallet adapters no longer reference WizardConnect

`PaytacaAdapter`, `CashonizeAdapter`, and `ZapitAdapter` previously read from
`window.*.wizardconnect`. They now read from the top-level `window.*` namespace
directly. Update any code that relied on the `.wizardconnect` property path.

---

## v0.3.0 — Wizard Connect Engine (replaces WalletConnect v2)

### What Changed

MintCore v0.3.0 replaced the WalletConnect v2 engine with Wizard Connect. This has now
also been removed in v0.4.0 (see above).

#### Removed in v0.3.0

| Symbol                  | Reason                                           |
|-------------------------|--------------------------------------------------|
| `WalletConnectProvider` | Replaced by `WizardConnectProvider`             |
| `WalletConnectClientLike` | Replaced by `WizardConnectClientLike`         |
| `WalletConnectProviderOptions` | Replaced by `WizardConnectProviderOptions`|
| `WalletConnectV2Client` | Replaced by `WizardConnectClientLike`           |
| `WalletConnectSession`  | Replaced by `WizardConnectSession`              |
| `WalletSession.topic`   | Replaced by `WalletSession.id`                  |
| `WalletSession.chainId` | Removed — not needed for BCH-native protocols   |
| `WalletManager.connect()` `chainId` parameter | Removed             |
| `WalletManager.reconnect()` `chainId` parameter | Removed           |
