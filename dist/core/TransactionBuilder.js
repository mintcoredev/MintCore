"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionBuilder = void 0;
class TransactionBuilder {
    constructor(config) {
        this.config = config;
    }
    async build(schema) {
        // 1. Fetch UTXOs for the minter
        const utxos = await this.fetchUtxos(this.config.privateKey);
        if (utxos.length === 0) {
            throw new Error("No UTXOs available for minting");
        }
        // 2. Select UTXO
        const utxo = utxos[0];
        // 3. Build transaction (placeholder for now)
        const hex = "00";
        const txid = "placeholder-txid";
        return { hex, txid };
    }
    async fetchUtxos(_privateKey) {
        // TODO: integrate with a BCH indexer or ElectrumX
        return [];
    }
}
exports.TransactionBuilder = TransactionBuilder;
//# sourceMappingURL=TransactionBuilder.js.map