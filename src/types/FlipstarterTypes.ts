/** A campaign defines the funding goal and beneficiary for a flipstarter. */
export interface FlipstarterCampaign {
  /** Beneficiary CashAddress that will receive funds when the campaign succeeds. */
  recipientAddress: string;
  /** Target funding amount in satoshis. The campaign succeeds once total pledges >= goalSatoshis. */
  goalSatoshis: number;
  /** Optional human-readable description of what the campaign funds. */
  description?: string;
}

/** A pledge is an ANYONECANPAY-signed commitment to contribute a specific UTXO to a campaign. */
export interface FlipstarterPledge {
  /** Pledged UTXO transaction ID. */
  txid: string;
  /** Output index of the pledged UTXO. */
  vout: number;
  /** Value of the pledged UTXO in satoshis. */
  satoshis: number;
  /** P2PKH locking bytecode of the pledged UTXO. */
  lockingBytecode: Uint8Array;
  /** ANYONECANPAY-signed unlocking bytecode for this input. */
  unlockingBytecode: Uint8Array;
}

/** Result returned after successfully assembling a funded campaign transaction. */
export interface FlipstarterResult {
  /** Fully-signed transaction hex ready for broadcast. */
  hex: string;
  /** Transaction ID of the assembled campaign transaction. */
  txid: string;
  /** Total satoshis pledged (sum of all pledge values). */
  totalPledged: number;
  /** Fee paid in satoshis. */
  fee: number;
}
