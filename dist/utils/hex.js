"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromHex = exports.toHex = void 0;
const toHex = (buffer) => Array.from(buffer)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
exports.toHex = toHex;
const fromHex = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
exports.fromHex = fromHex;
//# sourceMappingURL=hex.js.map