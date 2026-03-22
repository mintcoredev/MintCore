# Wallet API Reference

Public API introduced in MintCore v1.3.0 via the `WalletManager` and `WalletClient`
classes. All exports are available from the top-level `mintcore` package entry point.

## WalletManager Methods

### connect

```typescript
connect(
  client: WizardConnectClientLike,
  session: WizardConnectSession,
  walletType: WalletType
): Promise<WalletSession>
```

Registers an externally established Wizard Connect session. Transitions the manager
from `Disconnected` to `Connected` and emits the `connected` event.

- `client` — duck-typed Wizard Connect client instance
- `session` — the approved Wizard Connect session object
- `walletType` — one of the `WalletType` enum values

Returns the `WalletSession` record for the established connection.

---

### disconnect

```typescript
disconnect(): Promise<void>
```

Terminates the active Wizard Connect session, resets internal state to `Disconnected`,
and emits the `disconnected` event.

---

### getAddress

```typescript
getAddress(): Promise<string>
```

Returns the CashAddress of the connected wallet. The address is resolved via
`getAccounts()` on first call and cached for subsequent calls.

Throws if the manager is not in the `Connected` state.

---

### getWalletType

```typescript
getWalletType(): WalletType
```

Returns the `WalletType` enum value representing the connected wallet application.

Throws if the manager is not in the `Connected` state.

---

### signTransaction

```typescript
signTransaction(
  txHex: string,
  sourceOutputs: unknown[]
): Promise<string>
```

Requests the connected wallet to sign a serialised transaction. Returns the signed
transaction as a hex string.

- `txHex` — the unsigned transaction encoded as a hexadecimal string
- `sourceOutputs` — the source outputs required by the wallet for signing context

Throws if the manager is not in the `Connected` state.

---

### on

```typescript
on<K extends WalletEventName>(
  event: K,
  listener: (payload: WalletEventPayload[K]) => void
): this
```

Registers a listener for the named wallet event. Returns `this` for chaining.

---

### off

```typescript
off<K extends WalletEventName>(
  event: K,
  listener: (payload: WalletEventPayload[K]) => void
): this
```

Removes a previously registered listener for the named wallet event. Returns `this` for
chaining.

---

## Event System

`WalletManager` emits the following events:

| Event name    | Payload type            | Emitted when                                      |
|---------------|-------------------------|---------------------------------------------------|
| `connect`     | `WalletSession`         | A session is successfully established             |
| `disconnect`  | `void`                  | The session is terminated                         |
| `stateChange` | `WalletConnectionState` | The connection state transitions to a new value   |
| `error`       | `Error`                 | An unrecoverable error occurs during an operation |

### Example

```typescript
const manager = new WalletManager();

manager.on("connect", (session) => {
  console.log("Connected:", session.address);
});

manager.on("disconnect", () => {
  console.log("Wallet disconnected");
});

manager.on("stateChange", (state) => {
  console.log("State:", state);
});

manager.on("error", (err) => {
  console.error("Wallet error:", err.message);
});
```

---

## Types

### WalletType

```typescript
enum WalletType {
  Paytaca   = "paytaca",
  Cashonize = "cashonize",
  Zapit     = "zapit",
}
```

Enumerates the supported BCH wallet applications.

---

### WalletSession

```typescript
interface WalletSession {
  id:         string;
  address:    string;
  walletType: WalletType;
  createdAt:  number;
  expiry?:    number;
}
```

Serialisable record of an active wallet connection.

| Field        | Description                                                    |
|--------------|----------------------------------------------------------------|
| `id`         | Wizard Connect session identifier                              |
| `address`    | CashAddress of the connected wallet                            |
| `walletType` | Wallet application that approved the session                   |
| `createdAt`  | Unix timestamp (ms) when the session was established           |
| `expiry`     | Optional Unix timestamp (ms) when the session will expire      |

---

### WalletConnectionState

```typescript
enum WalletConnectionState {
  Disconnected  = "disconnected",
  Connecting    = "connecting",
  Connected     = "connected",
  Reconnecting  = "reconnecting",
  Error         = "error",
}
```

Represents the current phase of the wallet connection lifecycle.

---

### WalletEventName

```typescript
type WalletEventName = "connect" | "disconnect" | "stateChange" | "error";
```

Union of all event names emitted by `WalletManager`.

---

### WalletEventPayload

```typescript
interface WalletEventPayload {
  connect:     WalletSession;
  disconnect:  void;
  stateChange: WalletConnectionState;
  error:       Error;
}
```

Maps each event name to its payload type.

---

### WizardConnectClientLike

```typescript
interface WizardConnectClientLike {
  getAccounts(): Promise<string[]>;
  signTransaction(
    txHex: string,
    sourceOutputs: Array<{ satoshis: string; lockingBytecode: string }>
  ): Promise<string>;
  disconnect(): Promise<void>;
}
```

Duck-typed interface for a Wizard Connect client. Pass any object that satisfies this
shape to `WalletManager.connect()` or `WizardConnectProvider`.

---

### WizardConnectSession

```typescript
interface WizardConnectSession {
  id: string;
  expiry?: number;
}
```

Minimal Wizard Connect session descriptor.

---

### BchWalletAdapter

```typescript
interface BchWalletAdapter {
  readonly walletType: WalletType;
  connect(): Promise<string>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string>;
  signTransaction(
    txHex: string,
    sourceOutputs: ReadonlyArray<{ satoshis: bigint; lockingBytecode: Uint8Array }>
  ): Promise<string>;
}
```

Modular adapter interface for adding support for additional BCH wallets.
Implement this interface to integrate any BCH wallet into the engine.

---

## BCH Chain IDs

```typescript
const BCH_CHAIN_IDS: Record<BchNetwork, string> = {
  mainnet: "bch:bitcoincash",
  testnet: "bch:bchtest",
  regtest: "bch:bchreg",
};
```

Canonical CAIP-2 chain identifiers for each BCH network. Exported for reference.
