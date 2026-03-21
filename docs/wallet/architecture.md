# Wallet Engine Architecture

This document describes the WalletConnect v2 engine introduced in MintCore v1.2.0.

## Purpose

The wallet engine provides a typed, framework-agnostic layer for connecting Bitcoin Cash
wallets to MintCore via the [WalletConnect v2](https://walletconnect.com/) protocol. It
enables consumers to request addresses, sign transactions, and sign messages through any
supported BCH wallet without coupling to any UI framework, browser API, or DOM environment.

## Components

### WalletClient

`WalletClient` is the low-level WalletConnect v2 adapter. It wraps a duck-typed
`WalletConnectV2Client` instance and translates raw WalletConnect JSON-RPC calls into
typed BCH operations.

Responsibilities:

- Resolving the connected CashAddress via `bch_getAccounts`
- Signing serialised transactions via `bch_signTransaction`
- Signing arbitrary messages via `personal_sign`
- Caching the resolved address for the duration of the session
- Exposing session metadata (topic, chain ID, creation time, expiry)

`WalletClient` is intentionally thin. It holds no connection state and performs no
lifecycle management. All state decisions are delegated to `WalletManager`.

### WalletManager

`WalletManager` is the high-level orchestrator for wallet connection lifecycle. It owns
the active `WalletClient` instance, tracks `WalletConnectionState`, and notifies
subscribers of state transitions via a typed event emitter.

Responsibilities:

- Accepting an externally established WalletConnect session and promoting it to
  `Connected` state
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
- Defining `BCH_CHAIN_IDS` — the canonical namespace identifiers for each BCH network
- Defining `WalletSession` — the serialisable record of an established connection
- Defining `WalletEventName` and `WalletEventPayload` — the typed event contract

## BCH Namespaces

The wallet engine uses the following CAIP-2 chain identifiers for Bitcoin Cash networks:

| Network  | Namespace identifier |
|----------|----------------------|
| Mainnet  | `bch:bitcoincash`    |
| Testnet  | `bch:bchtest`        |
| Regtest  | `bch:bchreg`         |

These identifiers are exported as `BCH_CHAIN_IDS` from `WalletTypes`.

## Supported Wallets

The `WalletType` enumeration includes the following wallet applications:

| Enum value            | Wallet application |
|-----------------------|--------------------|
| `WalletType.Paytaca`  | Paytaca            |
| `WalletType.Cashonize`| Cashonize          |
| `WalletType.Zapit`    | Zapit              |

Any wallet that implements the `bch_getAccounts` and `bch_signTransaction` JSON-RPC
methods over a WalletConnect v2 session is compatible with `WalletClient`.

## Engine-Only Constraints

The wallet engine is designed for use in any JavaScript or TypeScript environment.
To preserve this generality, the following constraints are enforced:

- **No UI** — the engine contains no modal, dialog, overlay, or any other visual element.
- **No React** — there are no React components, hooks, or context providers.
- **No framework assumptions** — the engine does not depend on Angular, Vue, Svelte, or
  any other front-end framework.
- **No DOM access** — the engine does not read or write `document`, `window`, or any
  other browser global.
- **No styling** — the engine contains no CSS, CSS-in-JS, or inline style definitions.
- **No references to external projects** — the engine exports only MintCore types and
  does not import from any external application layer.

Consumers are responsible for providing the WalletConnect `SignClient` instance and for
rendering any UI that initiates the pairing flow.
