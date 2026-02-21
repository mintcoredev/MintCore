import { MintConfig } from "../types/MintConfig.js";
import { TokenSchema } from "../types/TokenSchema.js";
import { Utxo, BuiltTransaction } from "../types/TransactionTypes.js";
import { MintCoreError } from "../utils/errors.js";

const DUST_LIMIT = 546n;
const MIN_FEE = 1000n;

export class TransactionBuilder {
  constructor(private config: MintConfig) {}

  async build(schema: TokenSchema): Promise<BuiltTransaction> {
    // @bitauth/libauth is a pure ESM module; we use dynamic import to load it.
    const {
      walletTemplateP2pkhNonHd,
      walletTemplateToCompilerBCH,
      generateTransaction,
      encodeTransaction,
      hashTransaction,
      hexToBin,
      binToHex,
      hash160,
      encodeLockingBytecodeP2pkh,
      secp256k1,
      NonFungibleTokenCapability,
      isHex,
    } = await import("@bitauth/libauth");

    // 1. Derive public key and P2PKH locking bytecode from the private key
    const privateKeyBin = hexToBin(this.config.privateKey);
    const publicKey = secp256k1.derivePublicKeyCompressed(privateKeyBin);
    if (typeof publicKey === "string") {
      throw new MintCoreError(`Failed to derive public key: ${publicKey}`);
    }
    const lockingBytecode = encodeLockingBytecodeP2pkh(hash160(publicKey));

    // 2. Fetch UTXOs for the minter
    const utxos = await this.fetchUtxos(this.config.privateKey);
    if (utxos.length === 0) {
      throw new MintCoreError("No UTXOs available for minting");
    }

    // 3. Select the first UTXO as the genesis input
    const utxo = utxos[0];
    const utxoValue = BigInt(utxo.satoshis);

    // Token category = txid of the genesis input (in big-endian / UI byte order)
    const tokenCategory = hexToBin(utxo.txid);

    // 4. Build NFT token data if specified in the schema
    let nft: { capability: "none" | "mutable" | "minting"; commitment: Uint8Array } | undefined;
    if (schema.nft) {
      const raw = schema.nft.commitment;
      let commitmentBin: Uint8Array;
      if (raw.startsWith("0x")) {
        commitmentBin = hexToBin(raw.slice(2));
      } else if (isHex(raw)) {
        commitmentBin = hexToBin(raw);
      } else {
        commitmentBin = new TextEncoder().encode(raw);
      }
      nft = {
        capability: NonFungibleTokenCapability[schema.nft.capability],
        commitment: commitmentBin,
      };
    }

    // 5. Calculate change: utxoValue - token output value - fee
    const tokenOutputValue = DUST_LIMIT;
    const changeValue = utxoValue - tokenOutputValue - MIN_FEE;
    if (changeValue < 0n) {
      throw new MintCoreError("Insufficient funds: UTXO value is too small for minting");
    }

    // 6. Create the P2PKH compiler from the standard wallet template
    const compiler = walletTemplateToCompilerBCH(walletTemplateP2pkhNonHd);

    // 7. Build the transaction template
    const outputs: Array<{
      lockingBytecode: Uint8Array;
      token?: {
        amount: bigint;
        category: Uint8Array;
        nft?: { capability: "none" | "mutable" | "minting"; commitment: Uint8Array };
      };
      valueSatoshis: bigint;
    }> = [
      {
        lockingBytecode,
        token: {
          amount: schema.initialSupply,
          category: tokenCategory,
          ...(nft ? { nft } : {}),
        },
        valueSatoshis: tokenOutputValue,
      },
    ];

    if (changeValue > 0n) {
      outputs.push({ lockingBytecode, valueSatoshis: changeValue });
    }

    const template = {
      version: 2,
      locktime: 0,
      inputs: [
        {
          outpointTransactionHash: tokenCategory,
          outpointIndex: utxo.vout,
          sequenceNumber: 0,
          unlockingBytecode: {
            compiler,
            data: {
              keys: {
                privateKeys: { key: privateKeyBin },
              },
            },
            valueSatoshis: utxoValue,
            script: "unlock",
          },
        },
      ],
      outputs,
    };

    // 8. Generate the signed transaction
    const result = generateTransaction(template);
    if (!result.success) {
      throw new MintCoreError(
        `Transaction generation failed: ${JSON.stringify(result.errors)}`
      );
    }

    // 9. Encode and compute the transaction ID
    const encoded = encodeTransaction(result.transaction);
    const txid = hashTransaction(encoded);
    const hex = binToHex(encoded);

    return { hex, txid };
  }

  private async fetchUtxos(_privateKey: string): Promise<Utxo[]> {
    // Mock UTXO for development/testing.
    // In production, integrate with a BCH indexer (e.g. Chronik or ElectrumX).
    return [
      {
        txid: "0101010101010101010101010101010101010101010101010101010101010101",
        vout: 0,
        satoshis: 10000,
        scriptPubKey: "",
      },
    ];
  }
}
