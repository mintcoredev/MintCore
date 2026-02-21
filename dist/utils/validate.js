"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = validateSchema;
function validateSchema(schema) {
    if (!schema.name)
        throw new Error("Token name is required");
    if (!schema.symbol)
        throw new Error("Token symbol is required");
    if (schema.decimals < 0 || schema.decimals > 18) {
        throw new Error("Decimals must be between 0 and 18");
    }
    if (schema.initialSupply < 0n) {
        throw new Error("Initial supply must be non-negative");
    }
}
//# sourceMappingURL=validate.js.map