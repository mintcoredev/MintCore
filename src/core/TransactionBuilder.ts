import {
  secp256k1,
  hash160,
  hash256,
  encodeLockingBytecodeP2pkh,
  lockingBytecodeToCashAddress,
  encodeTransactionBCH,
  encodeDataPush,
  generateSigningSerializationBCH,
  NonFungibleTokenCapability,
  CashAddressNetworkPrefix,
} from "@bitauth/libauth";
import { MintConfig } from "../types/MintConfig.js";
import { TokenSchema } from "../types/TokenSchema.js";
import { Utxo, BuiltTransaction } from "../types/TransactionTypes.js";
import { MintCoreError } from "../utils/errors.js";
import { fromHex, toHex } from "../utils/hex.js";
import {
  estimateFee,
  DEFAULT_FEE_RATE,
  TOKEN_OUTPUT_DUST,
  DUST_THRESHOLD,
} from "../utils/fee.js";
import { selectUtxos } from "../utils/coinselect.js";
import { fetchUtxos as providerFetchUtxos, broadcastTransaction as providerBroadcast } from "./providerUtils.js";

/** Maximum allowed byte-length for a BCMR URI. */
const MAX_BCMR_URI_BYTES = 512;

/** BCH SIGHASH_ALL | SIGHASH_FORKID (0x41) */
const SIGHASH_ALL_FORKID = new Uint8Array([0x41]);

/** 4-byte ASCII marker used in every BCMR OP_RETURN output ("BCMR"). */
const BCMR_MARKER = new Uint8Array([0x42, 0x43, 0x4d, 0x52]);

/** OP_RETURN opcode. */
const OP_RETURN = 0x6a;

export class TransactionBuilder {
  private readonly hasProvider: boolean;

  constructor(private config: MintConfig) {
    this.hasProvider = !!(config.utxoProviderUrl || config.electrumxProviderUrl);
  }

  async build(schema: TokenSchema): Promise<BuiltTransaction> {
    if (!this.config.privateKey) {
      throw new MintCoreError(
        "No signing credentials configured. Provide `privateKey` in MintConfig."
      );
    }

    const privKeyBin = fromHex(this.config.privateKey);
    const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
    if (typeof pubKey === "string") {
      throw new MintCoreError(`Invalid private key: ${pubKey}`);
    }
    const lockingBytecode = encodeLockingBytecodeP2pkh(hash160(pubKey));

    if (!this.hasProvider) {
      return this.buildOfflineTransaction(schema, lockingBytecode);
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
    if (!this.hasProvider) {
      throw new MintCoreError(
        "No UTXO provider configured. Set `utxoProviderUrl` or `electrumxProviderUrl` in MintConfig."
      );
    }
    return providerBroadcast(this.config, txHex);
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

    const outputs: Array<{ lockingBytecode: Uint8Array; valueSatoshis: bigint; token?: any }> = [
      this.buildTokenOutput(schema, lockingBytecode, genesisTxid, TOKEN_OUTPUT_DUST),
    ];
    if (schema.bcmrUri) {
      outputs.push(this.buildBcmrOutput(schema.bcmrUri, schema.bcmrHash));
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
    const hex = toHex(txBytes);
    return { hex, rawHex: hex, txid: toHex(txid) };
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
    try {
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
    } finally {
      // Zero key material immediately after use to reduce exposure in memory
      privKeyBin.fill(0);
      pubKey.fill(0);
    }

    const txBytes = encodeTransactionBCH(tx);
    const txid = hash256(txBytes).reverse();
    const hex = toHex(txBytes);
    return { hex, rawHex: hex, txid: toHex(txid), fee };
  }

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
      1
    );

    // Sort selected UTXOs lexicographically by txid then vout for deterministic
    // transaction construction (same UTXO set → same txid every time).
    selected.sort((a, b) => {
      if (a.txid < b.txid) return -1;
      if (a.txid > b.txid) return 1;
      return a.vout - b.vout;
    });

    // The token category is the txid of the first input's outpoint (internal byte order).
    const categoryHash = fromHex(selected[0].txid).reverse();

    // Build outputs
    const outputs: Array<{ lockingBytecode: Uint8Array; valueSatoshis: bigint; token?: any }> = [
      this.buildTokenOutput(schema, lockingBytecode, categoryHash, TOKEN_OUTPUT_DUST),
    ];
    if (schema.bcmrUri) {
      outputs.push(this.buildBcmrOutput(schema.bcmrUri, schema.bcmrHash));
    }
    if (change > DUST_THRESHOLD) {
      outputs.push({ lockingBytecode, valueSatoshis: BigInt(change) });
    }

    // Build unsigned inputs
    const inputs = selected.map((utxo: Utxo) => ({
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

  /** Derive the CashAddress for the configured network and private key. */
  private deriveAddressFromConfig(): string {
    if (!this.config.privateKey) {
      throw new MintCoreError("Cannot derive address: no private key configured.");
    }
    const lockingBytecode = this.deriveLockingBytecode();
    const prefixMap: Record<string, CashAddressNetworkPrefix> = {
      mainnet: CashAddressNetworkPrefix.mainnet,
      testnet: CashAddressNetworkPrefix.testnet,
      regtest: CashAddressNetworkPrefix.regtest,
    };
    const prefix = prefixMap[this.config.network];
    if (!prefix) {
      throw new MintCoreError(`Unrecognized network: "${this.config.network}"`);
    }
    const result = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix });
    if (typeof result === "string") {
      throw new MintCoreError("Failed to derive CashAddress from private key");
    }
    return result.address;
  }

  private async fetchUtxos(): Promise<Utxo[]> {
    if (!this.hasProvider) {
      throw new MintCoreError(
        "No UTXO provider configured. Set `utxoProviderUrl` or `electrumxProviderUrl` in MintConfig."
      );
    }
    return providerFetchUtxos(this.config, this.deriveAddressFromConfig());
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
   * Format without hash:  OP_RETURN <push "BCMR"> <push uri>
   * Format with hash:     OP_RETURN <push "BCMR"> <push hash> <push uri>
   *
   * This follows the BCMR on-chain authchain convention:
   * https://github.com/bitjson/chip-bcmr
   */
  private buildBcmrOutput(uri: string, hash?: string) {
    const uriBytes = new TextEncoder().encode(uri);
    if (uriBytes.length > MAX_BCMR_URI_BYTES) {
      throw new MintCoreError(
        `BCMR URI is too long: ${uriBytes.length} bytes (max ${MAX_BCMR_URI_BYTES} bytes)`
      );
    }
    if (hash !== undefined) {
      if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)) {
        throw new MintCoreError(
          "Invalid bcmrHash: must be 64 lowercase hex characters"
        );
      }
    }
    const parts: number[] = [OP_RETURN, ...encodeDataPush(BCMR_MARKER)];
    if (hash !== undefined) {
      const hashBytes = fromHex(hash);
      parts.push(...encodeDataPush(hashBytes));
    }
    parts.push(...encodeDataPush(uriBytes));
    return { lockingBytecode: new Uint8Array(parts), valueSatoshis: 0n };
  }
}
