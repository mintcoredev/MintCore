"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintEngine = void 0;
const LibauthAdapter_1 = require("../adapters/LibauthAdapter");
const validate_1 = require("../utils/validate");
class MintEngine {
    constructor(config) {
        this.adapter = new LibauthAdapter_1.LibauthAdapter(config);
    }
    async mint(schema) {
        (0, validate_1.validateSchema)(schema);
        const tx = await this.adapter.buildMintTransaction(schema);
        return {
            hex: tx.hex,
            txid: tx.txid,
            metadata: schema.metadata ?? null
        };
    }
}
exports.MintEngine = MintEngine;
//# sourceMappingURL=MintEngine.js.map