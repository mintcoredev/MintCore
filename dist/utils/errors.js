"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MintCoreError = void 0;
class MintCoreError extends Error {
    constructor(message) {
        super(message);
        this.name = "MintCoreError";
    }
}
exports.MintCoreError = MintCoreError;
//# sourceMappingURL=errors.js.map