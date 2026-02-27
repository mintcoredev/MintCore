import {
  secp256k1,
  hash160,
  hash256,
  encodeLockingBytecodeP2pkh,
  decodeCashAddress,
  encodeTransactionBCH,
  encodeDataPush,
  generateSigningSerializationBCH,
} from "@bitauth/libauth";
import { MintConfig } from "../types/MintConfig.js";
import { Utxo } from "../types/TransactionTypes.js";
import {
  FlipstarterCampaign,
  FlipstarterPledge,
  FlipstarterResult,
} from "../types/FlipstarterTypes.js";
import { MintCoreError } from "../utils/errors.js";
import { fromHex, toHex } from "../utils/hex.js";
import { estimateFee, DEFAULT_FEE_RATE } from "../utils/fee.js";

/**
 * SIGHASH_ALL | SIGHASH_FORKID | ANYONECANPAY (0xC1)
 *
 * Using ANYONECANPAY allows each contributor to sign their own input
 * independently. The signature commits to all outputs but only to the
 * contributor's own input, so other pledge inputs can be added later
 * without invalidating any signature.
 */
const SIGHASH_ALL_FORKID_ANYONECANPAY = new Uint8Array([0xc1]);

/**
 * FlipstarterBuilder implements Bitcoin Cash assurance contracts (Flipstarter).
 *
 * Workflow:
 * 1. Each contributor calls `createPledge()` to produce a signed
 *    ANYONECANPAY commitment toward a campaign goal.
 * 2. Once enough pledges are collected, anyone can call `assembleCampaign()`
 *    to combine them into a complete, broadcast-ready transaction.
 */
export class FlipstarterBuilder {
  constructor(private readonly config: MintConfig) {}

  /**
   * Create an ANYONECANPAY-signed pledge committing `utxo` toward `campaign`.
   *
   * The pledge signature commits to the campaign's recipient output so the
   * assembled transaction must include exactly that output for the signatures
   * to remain valid.
   *
   * @param utxo     - The UTXO to pledge.
   * @param campaign - The campaign this pledge is for.
   * @returns A signed `FlipstarterPledge` ready to be passed to `assembleCampaign`.
   * @throws {MintCoreError} if the private key is missing or invalid.
   */
  createPledge(utxo: Utxo, campaign: FlipstarterCampaign): FlipstarterPledge {
    if (!this.config.privateKey) {
      throw new MintCoreError(
        "createPledge requires a privateKey in MintConfig."
      );
    }

    const privKeyBin = fromHex(this.config.privateKey);
    const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
    if (typeof pubKey === "string") {
      throw new MintCoreError(`Invalid private key: ${pubKey}`);
    }

    const pkh = hash160(pubKey);
    const pledgerLocking = encodeLockingBytecodeP2pkh(pkh);
    const recipientLocking = this.cashAddressToLockingBytecode(
      campaign.recipientAddress
    );

    // Build the minimal transaction used for signing.
    // SIGHASH_ALL means the signer commits to all outputs; ANYONECANPAY
    // means they only commit to their own input, so other pledge inputs
    // can be added to the final assembled transaction.
    //
    // The output value is fixed to `campaign.goalSatoshis`. The assembled
    // transaction MUST use the same value or the signature becomes invalid.
    // Any surplus (totalPledged - goalSatoshis - fee) goes to miners as fees.
    // Contributors should therefore pledge `goalSatoshis / numPledgers + fee_share`
    // so that fees are covered without invalidating signatures.
    const tx = {
      version: 2,
      inputs: [
        {
          outpointTransactionHash: fromHex(utxo.txid).reverse(),
          outpointIndex: utxo.vout,
          sequenceNumber: 0xffffffff,
          unlockingBytecode: new Uint8Array(0),
        },
      ],
      outputs: [
        {
          lockingBytecode: recipientLocking,
          valueSatoshis: BigInt(campaign.goalSatoshis),
        },
      ],
      locktime: 0,
    };

    const sourceOutputs = [
      {
        lockingBytecode: pledgerLocking,
        valueSatoshis: BigInt(utxo.satoshis),
      },
    ];

    const context = { inputIndex: 0, sourceOutputs, transaction: tx };
    const signingData = generateSigningSerializationBCH(context, {
      coveredBytecode: pledgerLocking,
      signingSerializationType: SIGHASH_ALL_FORKID_ANYONECANPAY,
    });
    const msgHash = hash256(signingData);
    const derSig = secp256k1.signMessageHashDER(privKeyBin, msgHash);
    if (typeof derSig === "string") {
      throw new MintCoreError(`Failed to sign pledge: ${derSig}`);
    }

    const sigWithHashType = new Uint8Array([
      ...derSig,
      SIGHASH_ALL_FORKID_ANYONECANPAY[0],
    ]);
    const unlockingBytecode = new Uint8Array([
      ...encodeDataPush(sigWithHashType),
      ...encodeDataPush(pubKey),
    ]);

    return {
      txid: utxo.txid,
      vout: utxo.vout,
      satoshis: utxo.satoshis,
      lockingBytecode: pledgerLocking,
      unlockingBytecode,
    };
  }

  /**
   * Assemble a complete campaign transaction from the provided pledges.
   *
   * The method verifies that the total pledged amount covers the campaign
   * goal plus transaction fees before constructing the final transaction.
   *
   * @param campaign - The campaign being funded.
   * @param pledges  - All pledges collected for this campaign.
   * @returns A `FlipstarterResult` containing the signed transaction hex.
   * @throws {MintCoreError} when pledges are insufficient to fund the campaign.
   */
  assembleCampaign(
    campaign: FlipstarterCampaign,
    pledges: FlipstarterPledge[]
  ): FlipstarterResult {
    if (pledges.length === 0) {
      throw new MintCoreError("Cannot assemble campaign: no pledges provided.");
    }

    const feeRate = this.config.feeRate ?? DEFAULT_FEE_RATE;
    const fee = estimateFee(pledges.length, 1, feeRate, false);
    const totalPledged = pledges.reduce((sum, p) => sum + p.satoshis, 0);

    if (totalPledged < campaign.goalSatoshis + fee) {
      throw new MintCoreError(
        `Insufficient pledges: have ${totalPledged} satoshis, need ${campaign.goalSatoshis + fee} (goal ${campaign.goalSatoshis} + fee ${fee})`
      );
    }

    const recipientLocking = this.cashAddressToLockingBytecode(
      campaign.recipientAddress
    );

    const tx = {
      version: 2,
      inputs: pledges.map((p) => ({
        outpointTransactionHash: fromHex(p.txid).reverse(),
        outpointIndex: p.vout,
        sequenceNumber: 0xffffffff,
        unlockingBytecode: p.unlockingBytecode,
      })),
      outputs: [
        {
          lockingBytecode: recipientLocking,
          valueSatoshis: BigInt(campaign.goalSatoshis),
        },
      ],
      locktime: 0,
    };

    const txBytes = encodeTransactionBCH(tx);
    const txid = toHex(hash256(txBytes).reverse());

    return {
      hex: toHex(txBytes),
      txid,
      totalPledged,
      fee,
    };
  }

  /**
   * Return the total satoshis committed across the given pledges.
   */
  getPledgeTotal(pledges: FlipstarterPledge[]): number {
    return pledges.reduce((sum, p) => sum + p.satoshis, 0);
  }

  /** Convert a CashAddress string to P2PKH locking bytecode. */
  private cashAddressToLockingBytecode(address: string): Uint8Array {
    const decoded = decodeCashAddress(address);
    if (typeof decoded === "string") {
      throw new MintCoreError(
        `Failed to decode CashAddress "${address}": ${decoded}`
      );
    }
    return encodeLockingBytecodeP2pkh(decoded.payload);
  }
}
