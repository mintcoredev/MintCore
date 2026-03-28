# React UI Layer — `@mintcore/ui`

The `@mintcore/ui` package provides React bindings for the MintCore wallet engine.
It wraps the pure-TypeScript `mintcore` SDK with a React context provider, a hook,
and ready-made components so you can integrate BCH wallet connectivity into a React
application with minimal boilerplate.

> **Note:** `@mintcore/ui` has a peer dependency on `mintcore` and `react ≥ 17`.
> The core `mintcore` SDK has **no** React dependency — you can use it in any
> JavaScript or TypeScript environment.

---

## Installation

```bash
npm install mintcore @mintcore/ui
```

---

## Architecture

```
@mintcore/ui
├── WalletProvider      — React context provider; owns connection state and actions
├── useWallet           — Primary hook; exposes state and actions to components
├── ConnectWalletButton — Self-contained connect/disconnect button component
└── BaseWalletAdapter   — Re-export of the SDK BaseWalletAdapter (for convenience)
```

The `@mintcore/ui` package **only** contains React-specific code.  All wallet
engine logic (signing, UTXO handling) lives in the `mintcore` SDK and is accessed
through the `WalletAdapter` interface.

---

## Quick Start

```tsx
import { PaytacaAdapter } from "mintcore";
import { WalletProvider, ConnectWalletButton } from "@mintcore/ui";

const adapters = [new PaytacaAdapter()];

export function App() {
  return (
    <WalletProvider adapters={adapters} autoConnect>
      <ConnectWalletButton />
    </WalletProvider>
  );
}
```

---

## `WalletProvider`

```tsx
import { WalletProvider } from "@mintcore/ui";
```

Wraps a component tree and makes the wallet state and actions available to all
descendant components via `useWallet`.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `adapters` | `WalletAdapter[]` | — | List of wallet adapters to make available |
| `autoConnect` | `boolean` | `false` | Automatically reconnect the last-used wallet on mount |
| `children` | `React.ReactNode` | — | Component subtree to provide wallet context to |

### Behaviour

- On mount with `autoConnect: true`, the provider reads `localStorage` for the
  last-used wallet name and reconnects if a matching adapter is registered.
- When a wallet connects, the adapter name is persisted to `localStorage` so it
  can be restored on the next page load.
- Only one wallet can be active at a time; connecting a new wallet disconnects the
  previous one.

### Example

```tsx
import { PaytacaAdapter, CashonizeAdapter } from "mintcore";
import { WalletProvider } from "@mintcore/ui";

const adapters = [
  new PaytacaAdapter(),
  new CashonizeAdapter(),
];

function Root() {
  return (
    <WalletProvider adapters={adapters} autoConnect>
      <App />
    </WalletProvider>
  );
}
```

---

## `useWallet`

```tsx
import { useWallet } from "@mintcore/ui";
```

Primary hook for interacting with the wallet system.  Returns the full
`WalletContextValue` from the nearest `WalletProvider` ancestor.

Throws if called outside of a `<WalletProvider>`.

### Returned value (`WalletContextValue`)

| Field | Type | Description |
|-------|------|-------------|
| `address` | `string \| null` | CashAddress of the connected wallet, or `null` |
| `isConnected` | `boolean` | `true` when the connection state is `"connected"` |
| `connectionState` | `WalletUIConnectionState` | Current lifecycle state |
| `error` | `Error \| null` | Last connection error, or `null` |
| `activeAdapter` | `WalletAdapter \| null` | Currently active adapter instance |
| `adapters` | `WalletAdapter[]` | All registered adapters |
| `connect` | `(adapterName: string) => Promise<void>` | Initiate a wallet connection |
| `disconnect` | `() => Promise<void>` | Terminate the active wallet connection |
| `signMessage` | `(message: string) => Promise<string>` | Sign an arbitrary message |
| `signTransaction` | `(tx: Uint8Array) => Promise<Uint8Array>` | Sign a raw transaction |
| `broadcastTransaction` | `(rawTx: Uint8Array) => Promise<string>` | Broadcast a signed transaction |

### Example

```tsx
import { useWallet } from "@mintcore/ui";

function WalletStatus() {
  const { address, isConnected, connectionState, adapters, connect, disconnect } =
    useWallet();

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      <p>State: {connectionState}</p>
      {adapters.map((a) => (
        <button key={a.name} onClick={() => connect(a.name)}>
          Connect {a.name}
        </button>
      ))}
    </div>
  );
}
```

---

## `ConnectWalletButton`

```tsx
import { ConnectWalletButton } from "@mintcore/ui";
```

Self-contained connect/disconnect button component. It requires no props and
handles all connection logic internally via `useWallet`.

- **Disconnected** — renders the connect button. If multiple adapters are registered,
  clicking opens a wallet-picker dropdown.
- **Connecting** — renders a disabled "Connecting…" button.
- **Connected** — renders the truncated wallet address; clicking disconnects.

Must be rendered inside a `<WalletProvider>`.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `connectLabel` | `string` | `"Connect Wallet"` | Label shown when disconnected |
| `className` | `string` | — | CSS class applied to the root `<div>` wrapper |

### Example

```tsx
import { ConnectWalletButton } from "@mintcore/ui";

function Header() {
  return (
    <header>
      <ConnectWalletButton connectLabel="Connect BCH Wallet" className="my-btn" />
    </header>
  );
}
```

---

## `BaseWalletAdapter`

```tsx
import { BaseWalletAdapter } from "@mintcore/ui";
// or equivalently:
import { BaseWalletAdapter } from "mintcore";
```

`@mintcore/ui` re-exports `BaseWalletAdapter` from the `mintcore` SDK for convenience.
You can import it from either package.

See the [Wallet API Reference](api/wallet.md) for full `BaseWalletAdapter` documentation.

---

## Types

```typescript
import type {
  WalletContextValue,
  WalletProviderProps,
  WalletUIConnectionState,
  ConnectWalletButtonProps,
} from "@mintcore/ui";
```

### `WalletUIConnectionState`

```typescript
type WalletUIConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
```

Simplified connection state used by the React UI layer. It is a subset of the SDK's
`WalletConnectionState` enum — the `"reconnecting"` state is not surfaced because
`WalletProvider` handles reconnection transparently, presenting it to components as
`"connecting"`. See [Wallet API Reference](api/wallet.md) for the full
`WalletConnectionState` definition.

---

## Further Reading

- [Wallet Engine Architecture](wallet/architecture.md) — the pure-TypeScript wallet engine
- [Wallet API Reference](api/wallet.md) — `WalletManager`, `BaseWalletAdapter`, and all wallet types
- [Overview & Architecture](overview.md) — MintCore architecture overview
