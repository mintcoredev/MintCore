# Wallet API Reference

Public API introduced in MintCore v1.2.0 via the `WalletManager` and `WalletClient`
classes. All exports are available from the top-level `mintcore` package entry point.

## WalletManager Methods

### connect

```typescript
connect(
  client: WalletConnectV2Client,
  session: WalletConnectSession,
  walletType: WalletType,
  chainId?: string
): Promise<WalletSession>
```

Registers an externally established WalletConnect v2 session. Transitions the manager
from `Disconnected` to `Connected` and emits the `connected` event.

- `client` — duck-typed WalletConnect v2 `SignClient` instance
- `session` — the approved WalletConnect session object
- `walletType` — one of the `WalletType` enum values
- `chainId` — optional CAIP-2 chain identifier; defaults to `bch:bitcoincash`

Returns the `WalletSession` record for the established connection.

---

### disconnect

```typescript
disconnect(): Promise<void>
```

Terminates the active WalletConnect session, resets internal state to `Disconnected`,
and emits the `disconnected` event.

---

### getAddress

```typescript
getAddress(): Promise<string>
```

Returns the CashAddress of the connected wallet. The address is resolved via the
`bch_getAccounts` JSON-RPC method on first call and cached for subsequent calls.

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

### signMessage

```typescript
signMessage(message: string): Promise<string>
```

Requests the connected wallet to sign an arbitrary UTF-8 message. Returns the signature
as a hex string.

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

| Event name       | Payload type              | Emitted when                                      |
|------------------|---------------------------|---------------------------------------------------|
| `connected`      | `WalletSession`           | A session is successfully established             |
| `disconnected`   | `void`                    | The session is terminated                         |
| `stateChange`    | `WalletConnectionState`   | The connection state transitions to a new value   |
| `error`          | `Error`                   | An unrecoverable error occurs during an operation |

### Example

```typescript
const manager = new WalletManager();

manager.on("connected", (session) => {
  console.log("Connected:", session.address);
});

manager.on("disconnected", () => {
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
  topic:      string;
  address:    string;
  chainId:    string;
  walletType: WalletType;
  createdAt:  number;
  expiry?:    number;
}
```

Serialisable record of an active wallet connection.

| Field        | Description                                                    |
|--------------|----------------------------------------------------------------|
| `topic`      | WalletConnect session topic identifier                         |
| `address`    | CashAddress of the connected wallet                            |
| `chainId`    | CAIP-2 chain identifier (e.g. `bch:bitcoincash`)               |
| `walletType` | Wallet application that approved the session                   |
| `createdAt`  | Unix timestamp (seconds) when the session was established      |
| `expiry`     | Optional Unix timestamp (seconds) when the session will expire |

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
type WalletEventName = "connected" | "disconnected" | "stateChange" | "error";
```

Union of all event names emitted by `WalletManager`.

---

### WalletEventPayload

```typescript
interface WalletEventPayload {
  connected:    WalletSession;
  disconnected: void;
  stateChange:  WalletConnectionState;
  error:        Error;
}
```

Maps each event name to its payload type.

---

## BCH Chain IDs

```typescript
const BCH_CHAIN_IDS: Record<BchNetwork, string> = {
  mainnet: "bch:bitcoincash",
  testnet: "bch:bchtest",
  regtest: "bch:bchreg",
};
```

Canonical CAIP-2 chain identifiers for each BCH network. Pass these values as the
`chainId` parameter when calling `connect`.
