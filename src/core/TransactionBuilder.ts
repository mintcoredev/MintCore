import {
  secp256k1,
  hash160,
  hash256,
  encodeLockingBytecodeP2pkh,
  lockingBytecodeToCashAddress,
  decodeCashAddress,
  encodeTransactionBCH,
  encodeDataPush,
  generateSigningSerializationBCH,
  NonFungibleTokenCapability,
  CashAddressNetworkPrefix,
} from "@bitauth/libauth";
import { MintConfig } from "../types/MintConfig";
import { TokenSchema } from "../types/TokenSchema";
import { Utxo, BuiltTransaction } from "../types/TransactionTypes";
import { ChronikProvider } from "../providers/ChronikProvider";
import { ElectrumXProvider } from "../providers/ElectrumXProvider";
import { MintCoreError } from "../utils/errors";
import { fromHex, toHex } from "../utils/hex";
import {
  estimateFee,
  DEFAULT_FEE_RATE,
  TOKEN_OUTPUT_DUST,
  DUST_THRESHOLD,
} from "../utils/fee";
import { selectUtxos } from "../utils/coinselect";

/** BCH SIGHASH_ALL | SIGHASH_FORKID (0x41) */
const SIGHASH_ALL_FORKID = new Uint8Array([0x41]);

/** 4-byte ASCII marker used in every BCMR OP_RETURN output ("BCMR"). */
const BCMR_MARKER = new Uint8Array([0x42, 0x43, 0x4d, 0x52]);

/** OP_RETURN opcode. */
const OP_RETURN = 0x6a;

export class TransactionBuilder {
  private readonly utxoProvider?: ChronikProvider | ElectrumXProvider;

  constructor(private config: MintConfig) {
    if (config.utxoProviderUrl) {
      this.utxoProvider = new ChronikProvider(config.utxoProviderUrl, config.network);
    } else if (config.electrumxProviderUrl) {
      this.utxoProvider = new ElectrumXProvider(config.electrumxProviderUrl, config.network);
    }
  }

  async build(schema: TokenSchema): Promise<BuiltTransaction> {
    if (!this.config.privateKey && !this.config.walletProvider) {
      throw new MintCoreError(
        "No signing credentials configured. Provide `privateKey` or `walletProvider` in MintConfig."
      );
    }

    const lockingBytecode = await this.getLockingBytecode();

    if (!this.utxoProvider) {
      return this.buildOfflineTransaction(schema, lockingBytecode);
    }

    if (this.config.walletProvider && !this.config.privateKey) {
      return this.buildWalletFundedTransaction(schema, lockingBytecode);
    }

    const privKeyBin = fromHex(this.config.privateKey!);
    const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
    if (typeof pubKey === "string") {
      throw new MintCoreError(`Invalid private key: ${pubKey}`);
    }

    return this.buildFundedTransaction(schema, lockingBytecode, privKeyBin, pubKey);
  }

  /**
   * Broadcast a signed raw transaction via the configured UTXO provider.
   *
   * @param txHex - Fully-signed transaction hex string.
   * @returns The resulting transaction ID returned by the network.
   * @throws {MintCoreError} when no provider is configured or the broadcast fails.
   */
  async broadcast(txHex: string): Promise<string> {
    if (!this.utxoProvider) {
      throw new MintCoreError(
        "No UTXO provider configured. Set `utxoProviderUrl` or `electrumxProviderUrl` in MintConfig."
      );
    }
    return this.utxoProvider.broadcastTransaction(txHex);
  }

  /**
   * Build an offline genesis transaction using a zero outpoint.
   * No UTXOs are needed; the token category is derived from the zero txid.
   */
  private buildOfflineTransaction(
    schema: TokenSchema,
    lockingBytecode: Uint8Array
  ): BuiltTransaction {
    const genesisTxid = new Uint8Array(32);

    const outputs = [
      this.buildTokenOutput(schema, lockingBytecode, genesisTxid, TOKEN_OUTPUT_DUST),
    ];
    if (schema.bcmrUri) {
      outputs.push(this.buildBcmrOutput(schema.bcmrUri));
    }

    const tx = {
      version: 2,
      inputs: [
        {
          outpointTransactionHash: genesisTxid,
          outpointIndex: 0,
          sequenceNumber: 0xffffffff,
          unlockingBytecode: new Uint8Array(0),
        },
      ],
      outputs,
      locktime: 0,
    };

    const txBytes = encodeTransactionBCH(tx);
    const txid = hash256(txBytes).reverse();
    return { hex: toHex(txBytes), txid: toHex(txid) };
  }

  /**
   * Build a funded, signed genesis transaction using real UTXOs.
   *
   * Steps:
   * 1. Fetch UTXOs for the derived address.
   * 2. Determine the number of outputs (token [+ BCMR OP_RETURN] [+ change]).
   * 3. Select UTXOs via greedy coin-selection with dynamic fee estimation.
   * 4. Construct and sign each input (P2PKH, ECDSA DER).
   * 5. Return the serialised transaction.
   */
  private async buildFundedTransaction(
    schema: TokenSchema,
    lockingBytecode: Uint8Array,
    privKeyBin: Uint8Array,
    pubKey: Uint8Array
  ): Promise<BuiltTransaction> {
    const { tx, selected, fee } = await this.prepareFundedTransaction(schema, lockingBytecode);

    // Source outputs (the UTXOs being spent) – needed for sighash computation
    const sourceOutputs = selected.map((utxo) => ({
      lockingBytecode,
      valueSatoshis: BigInt(utxo.satoshis),
    }));

    // Sign each input with P2PKH ECDSA (DER encoding) + SIGHASH_ALL|FORKID
    for (let i = 0; i < tx.inputs.length; i++) {
      const context = { inputIndex: i, sourceOutputs, transaction: tx };
      const signingData = generateSigningSerializationBCH(context, {
        coveredBytecode: lockingBytecode,
        signingSerializationType: SIGHASH_ALL_FORKID,
      });
      const msgHash = hash256(signingData);
      const derSig = secp256k1.signMessageHashDER(privKeyBin, msgHash);
      if (typeof derSig === "string") {
        throw new MintCoreError(`Failed to sign input ${i}: ${derSig}`);
      }
      const sigWithHashType = new Uint8Array([...derSig, SIGHASH_ALL_FORKID[0]]);
      tx.inputs[i].unlockingBytecode = new Uint8Array([
        ...encodeDataPush(sigWithHashType),
        ...encodeDataPush(pubKey),
      ]);
    }

    const txBytes = encodeTransactionBCH(tx);
    const txid = hash256(txBytes).reverse();
    return { hex: toHex(txBytes), txid: toHex(txid), fee };
  }

  /**
   * Build a funded transaction and have the configured wallet provider sign it.
   *
   * The unsigned transaction is serialised, handed to the wallet via
   * `walletProvider.signTransaction()`, and the signed result is returned.
   */
  private async buildWalletFundedTransaction(
    schema: TokenSchema,
    lockingBytecode: Uint8Array
  ): Promise<BuiltTransaction> {
    const { tx, selected, fee } = await this.prepareFundedTransaction(schema, lockingBytecode);

    const unsignedHex = toHex(encodeTransactionBCH(tx));

    const sourceOutputs = selected.map((utxo) => ({
      satoshis: BigInt(utxo.satoshis),
      lockingBytecode,
    }));

    const signedHex = await this.config.walletProvider!.signTransaction(
      unsignedHex,
      sourceOutputs
    );

    // Derive the txid from the signed transaction bytes
    const signedBytes = fromHex(signedHex);
    const txid = toHex(hash256(signedBytes).reverse());
    return { hex: signedHex, txid, fee };
  }

  /**
   * Shared helper: fetch UTXOs, select coins, and build the unsigned funded
   * transaction structure (inputs + outputs). Used by both
   * `buildFundedTransaction` (private-key signing) and
   * `buildWalletFundedTransaction` (wallet-provider signing).
   */
  private async prepareFundedTransaction(
    schema: TokenSchema,
    lockingBytecode: Uint8Array
  ): Promise<{
    tx: {
      version: number;
      inputs: Array<{
        outpointTransactionHash: Uint8Array;
        outpointIndex: number;
        sequenceNumber: number;
        unlockingBytecode: Uint8Array;
      }>;
      outputs: Array<{ lockingBytecode: Uint8Array; valueSatoshis: bigint; token?: any }>;
      locktime: number;
    };
    selected: Utxo[];
    fee: number;
  }> {
    const utxos = await this.fetchUtxos();
    if (utxos.length === 0) {
      throw new MintCoreError("No UTXOs available for minting");
    }

    const feeRate = this.config.feeRate ?? DEFAULT_FEE_RATE;

    // Non-change outputs: token output + optional BCMR OP_RETURN
    const nonChangeOutputCount = 1 + (schema.bcmrUri ? 1 : 0);

    const { selected, fee, change } = selectUtxos(
      utxos,
      TOKEN_OUTPUT_DUST,
      nonChangeOutputCount,
      feeRate,
      true
    );

    // The token category is the txid of the first input's outpoint (internal byte order).
    const categoryHash = fromHex(selected[0].txid).reverse();

    // Build outputs
    const outputs = [
      this.buildTokenOutput(schema, lockingBytecode, categoryHash, TOKEN_OUTPUT_DUST),
    ];
    if (schema.bcmrUri) {
      outputs.push(this.buildBcmrOutput(schema.bcmrUri));
    }
    if (change > DUST_THRESHOLD) {
      outputs.push({ lockingBytecode, valueSatoshis: BigInt(change) });
    }

    // Build unsigned inputs
    const inputs = selected.map((utxo) => ({
      outpointTransactionHash: fromHex(utxo.txid).reverse(),
      outpointIndex: utxo.vout,
      sequenceNumber: 0xffffffff,
      unlockingBytecode: new Uint8Array(0),
    }));

    const tx = { version: 2, inputs, outputs, locktime: 0 };
    return { tx, selected, fee };
  }

  /** Derive the P2PKH locking bytecode from the configured private key. */
  private deriveLockingBytecode(): Uint8Array {
    const privKeyBin = fromHex(this.config.privateKey!);
    const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
    if (typeof pubKey === "string") {
      throw new MintCoreError(`Invalid private key: ${pubKey}`);
    }
    const pkh = hash160(pubKey);
    return encodeLockingBytecodeP2pkh(pkh);
  }

  /**
   * Return the P2PKH locking bytecode, preferring the wallet provider address
   * when no private key is configured.
   */
  private async getLockingBytecode(): Promise<Uint8Array> {
    if (!this.config.privateKey && this.config.walletProvider) {
      const address = await this.config.walletProvider.getAddress();
      const decoded = decodeCashAddress(address);
      if (typeof decoded === "string") {
        throw new MintCoreError(`Failed to decode wallet address: ${decoded}`);
      }
      return encodeLockingBytecodeP2pkh(decoded.payload);
    }
    return this.deriveLockingBytecode();
  }

  /** Derive the CashAddress for the configured network and private key. */
  private deriveAddressFromConfig(): string {
    if (!this.config.privateKey) {
      throw new MintCoreError("Cannot derive address: no private key configured.");
    }
    const lockingBytecode = this.deriveLockingBytecode();
    const prefixMap: Record<string, string> = {
      mainnet: CashAddressNetworkPrefix.mainnet,
      testnet: CashAddressNetworkPrefix.testnet,
      regtest: CashAddressNetworkPrefix.regtest,
    };
    const prefix = prefixMap[this.config.network];
    if (!prefix) {
      throw new MintCoreError(`Unrecognized network: "${this.config.network}"`);
    }
    const result = lockingBytecodeToCashAddress(lockingBytecode, prefix);
    if (typeof result !== "string") {
      throw new MintCoreError("Failed to derive CashAddress from private key");
    }
    return result;
  }

  private async fetchUtxos(): Promise<Utxo[]> {
    if (!this.utxoProvider) {
      throw new MintCoreError(
        "No UTXO provider configured. Set `utxoProviderUrl` or `electrumxProviderUrl` in MintConfig."
      );
    }
    const address = this.config.walletProvider && !this.config.privateKey
      ? await this.config.walletProvider.getAddress()
      : this.deriveAddressFromConfig();
    return this.utxoProvider.fetchUtxos(address);
  }

  /** Encode the NFT commitment string to bytes (hex or UTF-8). */
  private encodeCommitment(raw: string): Uint8Array {
    if (raw.startsWith("0x")) {
      return fromHex(raw.slice(2));
    }
    if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
      return fromHex(raw);
    }
    return new TextEncoder().encode(raw);
  }

  private buildTokenOutput(
    schema: TokenSchema,
    lockingBytecode: Uint8Array,
    category: Uint8Array,
    valueSatoshis: number
  ) {
    const tokenData: {
      amount: bigint;
      category: Uint8Array;
      nft?: { capability: NonFungibleTokenCapability; commitment: Uint8Array };
    } = {
      amount: schema.initialSupply,
      category,
    };

    if (schema.nft) {
      const capMap: Record<string, NonFungibleTokenCapability> = {
        none: NonFungibleTokenCapability.none,
        mutable: NonFungibleTokenCapability.mutable,
        minting: NonFungibleTokenCapability.minting,
      };
      tokenData.nft = {
        capability: capMap[schema.nft.capability],
        commitment: this.encodeCommitment(schema.nft.commitment),
      };
    }

    return {
      lockingBytecode,
      valueSatoshis: BigInt(valueSatoshis),
      token: tokenData,
    };
  }

  /**
   * Build an OP_RETURN output carrying BCMR metadata.
   *
   * Format: OP_RETURN <push "BCMR"> <push uri>
   *
   * This follows the BCMR on-chain authchain convention:
   * https://github.com/bitjson/chip-bcmr
   */
  private buildBcmrOutput(uri: string) {
    const uriBytes = new TextEncoder().encode(uri);
    const lockingBytecode = new Uint8Array([
      OP_RETURN,
      ...encodeDataPush(BCMR_MARKER),
      ...encodeDataPush(uriBytes),
    ]);
    return { lockingBytecode, valueSatoshis: 0n };
  }
}
