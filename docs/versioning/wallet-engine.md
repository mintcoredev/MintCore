# Wallet Engine — Versioning Notes

Introduced in **MintCore v1.3.0**.

## Why the Version Was Bumped

MintCore v1.3.0 replaces the WalletConnect v2 engine with Wizard Connect — a BCH-native
wallet connection protocol. This removes all WalletConnect, EVM, and multi-chain
abstractions and replaces them with a clean, BCH-first API.

The change is a minor version bump because:

- New exports were added (`WizardConnectClientLike`, `WizardConnectSession`,
  `WizardConnectProvider`, `BchWalletAdapter`).
- Breaking changes were made to `WalletSession` (`topic`/`chainId` removed; `id` added)
  and `WalletManager.connect()` / `reconnect()` (signatures simplified).

Consumers upgrading from v1.2.x must update their `WalletManager.connect()` calls and
any code that reads `WalletSession.topic` or `WalletSession.chainId`.

## What Changed

### Removed

| Symbol                  | Reason                                      |
|-------------------------|---------------------------------------------|
| `WalletConnectProvider` | Replaced by `WizardConnectProvider`         |
| `WalletConnectClientLike` | Replaced by `WizardConnectClientLike`     |
| `WalletConnectProviderOptions` | Replaced by `WizardConnectProviderOptions` |
| `WalletConnectV2Client` | Replaced by `WizardConnectClientLike`       |
| `WalletConnectSession`  | Replaced by `WizardConnectSession`          |
| `WalletSession.topic`   | Replaced by `WalletSession.id`              |
| `WalletSession.chainId` | Removed — Wizard Connect is BCH-native      |
| `WalletManager.connect()` `chainId` parameter | Removed          |
| `WalletManager.reconnect()` `chainId` parameter | Removed        |
| `WalletClient.signMessage()` | Removed — `personal_sign` is EVM-derived |
| `WalletManager.signMessage()` | Removed                              |

### Added

| Symbol                    | Description                                         |
|---------------------------|-----------------------------------------------------|
| `WizardConnectClientLike` | Duck-typed interface for Wizard Connect clients     |
| `WizardConnectSession`    | Session descriptor returned by the connection flow  |
| `WizardConnectProvider`   | `WalletProvider` adapter for Wizard Connect         |
| `WizardConnectProviderOptions` | Options for `WizardConnectProvider`            |
| `BchWalletAdapter`        | Modular interface for BCH wallet adapters           |

## Migration Notes for Consumers

### Updating `WalletManager.connect()`

**Before (v1.2.x):**

```typescript
import { WalletManager, WalletType } from "mintcore";

const session = await manager.connect(signClient, wcSession, WalletType.Paytaca, "bch:bitcoincash");
```

**After (v1.3.0):**

```typescript
import { WalletManager, WalletType } from "mintcore";

const session = await manager.connect(wizardClient, wizardSession, WalletType.Paytaca);
// No chainId parameter — Wizard Connect is BCH-native
```

### Updating `WalletSession` access

**Before (v1.2.x):**

```typescript
console.log(session.topic);   // WalletConnect topic
console.log(session.chainId); // CAIP-2 chain ID
```

**After (v1.3.0):**

```typescript
console.log(session.id);      // Wizard Connect session ID
// chainId no longer exists on WalletSession
```

### Replacing `WalletConnectProvider` with `WizardConnectProvider`

**Before (v1.2.x):**

```typescript
import SignClient from "@walletconnect/sign-client";
import { WalletConnectProvider } from "mintcore";

const client = await SignClient.init({ projectId: "..." });
const provider = new WalletConnectProvider({ client, topic: session.topic });
```

**After (v1.3.0):**

```typescript
import { WizardConnectProvider } from "mintcore";

// client must be an initialised Wizard Connect client
const provider = new WizardConnectProvider({ client });
```

### No UI Provided

The wallet engine does not include a QR code modal, connection dialog, or any other UI
element. If your application requires a visual connection flow, you must implement or
integrate a UI component separately.
