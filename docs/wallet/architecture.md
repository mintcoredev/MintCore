# Wallet Engine Architecture

This document describes the BCH wallet engine in MintCore.

## Purpose

The wallet engine provides a typed, framework-agnostic layer for connecting Bitcoin Cash
wallets to MintCore. It enables consumers to request addresses and sign transactions
through any supported BCH wallet without coupling to any UI framework, browser API, or
DOM environment.

## Components

### WalletClient

`WalletClient` is the low-level BCH wallet adapter. It wraps a duck-typed
`BchWalletClientLike` instance and translates wallet calls into typed BCH operations.

Responsibilities:

- Resolving the connected CashAddress via `getAccounts()`
- Signing serialised transactions via `signTransaction()`
- Caching the resolved address for the duration of the session
- Exposing session metadata (id, creation time, expiry)

`WalletClient` is intentionally thin. It holds no connection state and performs no
lifecycle management. All state decisions are delegated to `WalletManager`.

### WalletManager

`WalletManager` is the high-level orchestrator for wallet connection lifecycle. It owns
the active `WalletClient` instance, tracks `WalletConnectionState`, and notifies
subscribers of state transitions via a typed event emitter.

Responsibilities:

- Accepting an externally established wallet session and promoting it to `Connected` state
- Disconnecting and cleaning up the active session
- Reconnecting with a new session while preserving subscriber registrations
- Delegating signing operations to the active `WalletClient`
- Emitting `connected`, `disconnected`, `stateChange`, and `error` events

Connection state machine:

```
Disconnected → Connecting → Connected
                               ↓
                           Reconnecting → Connected
                               ↓
                             Error
```

### WalletTypes

`WalletTypes` contains all shared enumerations, constants, and interfaces used across the
wallet engine.

Responsibilities:

- Defining `WalletType` — the enumeration of supported wallet applications
- Defining `WalletConnectionState` — the enumeration of connection lifecycle states
- Defining `BCH_CHAIN_IDS` — canonical CAIP-2 identifiers for each BCH network (for
  reference only)
- Defining `WalletSession` — the serialisable record of an established connection
- Defining `WalletEventName` and `WalletEventPayload` — the typed event contract

### BchWalletAdapter

`BchWalletAdapter` is the modular adapter interface for BCH wallet integrations.
Implementing this interface allows any BCH wallet (browser extension, hardware wallet,
mobile wallet) to be plugged into the engine without changes to `WalletManager`.

Responsibilities:

- Declaring the `walletType` of the wallet
- Providing `connect()`, `disconnect()`, `getAddress()`, and `signTransaction()` methods
- Hiding all wallet-specific transport details behind a uniform API

### BaseWalletAdapter

`BaseWalletAdapter` is the base implementation of the `WalletAdapter` interface.
Concrete adapters (`PaytacaAdapter`, `CashonizeAdapter`, `ZapitAdapter`) extend it to
provide wallet-specific client injection while inheriting all connection, signing, and
event-handling logic.

## BCH Namespaces

The following CAIP-2 chain identifiers are exported as `BCH_CHAIN_IDS` for convenience:

| Network  | Namespace identifier |
|----------|----------------------|
| Mainnet  | `bch:bitcoincash`    |
| Testnet  | `bch:bchtest`        |
| Regtest  | `bch:bchreg`         |

## Supported Wallets

The `WalletType` enumeration includes the following wallet applications:

| Enum value            | Wallet application |
|-----------------------|--------------------|
| `WalletType.Paytaca`  | Paytaca            |
| `WalletType.Cashonize`| Cashonize          |
| `WalletType.Zapit`    | Zapit              |

Any wallet that implements the `getAccounts()` and `signTransaction()` methods is
compatible with `WalletClient`.

## Engine-Only Constraints

The wallet engine is designed for use in any JavaScript or TypeScript environment.
To preserve this generality, the following constraints are enforced:

- **No UI** — the engine contains no modal, dialog, overlay, or any other visual element.
- **No React** — there are no React components, hooks, or context providers.
- **No framework assumptions** — the engine does not depend on Angular, Vue, Svelte, or
  any other front-end framework.
- **No DOM access** — the engine does not read or write `document`, `window`, or any
  other browser global.
- **No EVM abstractions** — the engine contains no Ethereum chain IDs, EVM-specific
  RPC methods, or multi-chain wallet logic.
- **No styling** — the engine contains no CSS, CSS-in-JS, or inline style definitions.

Consumers are responsible for providing the wallet client instance and for rendering any
UI that initiates the connection flow.
