import {
  secp256k1,
  hash160,
  hash256,
  encodeLockingBytecodeP2pkh,
  lockingBytecodeToCashAddress,
  encodeTransactionBCH,
  NonFungibleTokenCapability,
  CashAddressNetworkPrefix,
} from "@bitauth/libauth";
import { MintConfig } from "../types/MintConfig";
import { TokenSchema } from "../types/TokenSchema";
import { Utxo, BuiltTransaction } from "../types/TransactionTypes";
import { ChronikProvider } from "../providers/ChronikProvider";
import { MintCoreError } from "../utils/errors";
import { fromHex, toHex } from "../utils/hex";

export class TransactionBuilder {
  private readonly chronik?: ChronikProvider;

  constructor(private config: MintConfig) {
    if (config.utxoProviderUrl) {
      this.chronik = new ChronikProvider(config.utxoProviderUrl, config.network);
    }
  }

  async build(schema: TokenSchema): Promise<BuiltTransaction> {
    if (this.chronik) {
      const utxos = await this.fetchUtxos();
      if (utxos.length === 0) {
        throw new MintCoreError("No UTXOs available for minting");
      }
    }

    const lockingBytecode = this.deriveLockingBytecode();

    // Use a deterministic zero outpoint for offline genesis builds.
    // The token category is always the first input's outpoint txhash.
    const genesisTxid = new Uint8Array(32);

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
      outputs: [this.buildTokenOutput(schema, lockingBytecode, genesisTxid)],
      locktime: 0,
    };

    const txBytes = encodeTransactionBCH(tx);
    const txid = hash256(txBytes).reverse();

    return { hex: toHex(txBytes), txid: toHex(txid) };
  }

  /** Derive the P2PKH locking bytecode from the configured private key. */
  private deriveLockingBytecode(): Uint8Array {
    const privKeyBin = fromHex(this.config.privateKey);
    const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
    if (typeof pubKey === "string") {
      throw new MintCoreError(`Invalid private key: ${pubKey}`);
    }
    const pkh = hash160(pubKey);
    return encodeLockingBytecodeP2pkh(pkh);
  }

  /** Derive the CashAddress for the configured network and private key. */
  private deriveAddressFromConfig(): string {
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
    if (!this.chronik) {
      throw new MintCoreError(
        "No UTXO provider configured. Set `utxoProviderUrl` in MintConfig to use Chronik."
      );
    }
    const address = this.deriveAddressFromConfig();
    return this.chronik.fetchUtxos(address);
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
    category: Uint8Array
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
      valueSatoshis: BigInt(1000),
      token: tokenData,
    };
  }
}
