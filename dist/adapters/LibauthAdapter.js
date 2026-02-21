"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibauthAdapter = void 0;
const TransactionBuilder_1 = require("../core/TransactionBuilder");
class LibauthAdapter {
    constructor(config) {
        this.config = config;
        this.builder = new TransactionBuilder_1.TransactionBuilder(config);
    }
    async buildMintTransaction(schema) {
        const tx = await this.builder.build(schema);
        return {
            hex: tx.hex,
            txid: tx.txid
        };
    }
}
exports.LibauthAdapter = LibauthAdapter;
//# sourceMappingURL=LibauthAdapter.js.map