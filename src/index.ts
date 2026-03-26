export { MintEngine } from "./core/MintEngine.js";
export { LibauthAdapter } from "./adapters/LibauthAdapter.js";

export * from "./types/MintConfig.js";
export * from "./types/TokenSchema.js";
export * from "./types/WalletProvider.js";
export * from "./core/MintResult.js";
export * from "./types/TransactionTypes.js";
export * from "./types/BatchMintTypes.js";

export { MintCoreError } from "./utils/errors.js";
export { mintFungibleToken, mintNFT, verifyMint, createMetadata, encodeMetadata } from "./utils/convenience.js";
export { validateSchema, validateUtxo, validateMintRequest, validateBatchMintOptions } from "./utils/validate.js";
export { TransactionBuilder } from "./core/TransactionBuilder.js";
export { BatchMintEngine } from "./core/BatchMintEngine.js";
export { ChronikProvider } from "./providers/ChronikProvider.js";
export { ElectrumXProvider } from "./providers/ElectrumXProvider.js";
export { WizardConnectProvider } from "./providers/WizardConnectProvider.js";
export type { WizardConnectProviderOptions } from "./providers/WizardConnectProvider.js";
export { estimateFee, estimateBatchTxFee, estimateBatchTxSize, DEFAULT_FEE_RATE, TOKEN_OUTPUT_DUST, DUST_THRESHOLD, MINTING_BATON_INPUT_OVERHEAD } from "./utils/fee.js";
export { selectUtxos } from "./utils/coinselect.js";
export type { CoinSelectResult } from "./utils/coinselect.js";
export { UtxoLock } from "./utils/utxoLock.js";
export { VERSION } from "./version.js";
export { generateKey, deriveAddress } from "./utils/keys.js";

// ── wallet engine ─────────────────────────────────────────────────────────────
export {
  WalletClient,
  WalletManager,
  WalletType,
  WalletConnectionState,
  BCH_CHAIN_IDS,
  WizardAdapter,
  PaytacaAdapter,
  ZapitAdapter,
  CashonizeAdapter,
  WizardConnectMobileAdapter,
  PaytacaMobileAdapter,
  ZapitMobileAdapter,
  CashonizeMobileAdapter,
  WalletRegistry,
  createWalletRegistry,
  createAdaptiveWalletRegistry,
} from "./wallet/index.js";
export type {
  WalletClientOptions,
  WizardConnectClientLike,
  WizardConnectSession,
  WalletManagerOptions,
  BchNetwork,
  WalletSession,
  WalletEventName,
  WalletEventPayload,
  BchWalletAdapter,
  WalletAdapter,
  WizardAdapterClientLike,
  BchSourceOutput,
} from "./wallet/index.js";

// ── WizardConnect mobile utilities ────────────────────────────────────────────
export {
  handleWizardConnectRedirect,
  saveMobileSession,
  loadMobileSession,
  clearMobileSession,
  saveEphemeralPrivKey,
  loadEphemeralPrivKey,
  clearEphemeralPrivKey,
  decryptMobileSession,
} from "./wizardconnect/session.js";
export type {
  WizardConnectEncryptedSession,
  WizardConnectMobileSession,
} from "./wizardconnect/session.js";

// ── Crypto / encoding utilities ───────────────────────────────────────────────
export { base64urlEncode, base64urlDecode } from "./utils/base64url.js";
