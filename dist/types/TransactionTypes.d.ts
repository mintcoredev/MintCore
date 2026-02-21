export interface Utxo {
    txid: string;
    vout: number;
    satoshis: number;
    scriptPubKey: string;
}
export interface TokenOutput {
    valueSatoshis: number;
    category: string;
    amount: bigint;
    nft?: {
        capability: "none" | "mutable" | "minting";
        commitment: string;
    };
    lockingBytecode: Uint8Array;
}
export interface BuiltTransaction {
    hex: string;
    txid: string;
}
//# sourceMappingURL=TransactionTypes.d.ts.map