"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.privateKeyToBin = privateKeyToBin;
const libauth_1 = require("@bitauth/libauth");
function privateKeyToBin(key) {
    return (0, libauth_1.hexToBin)(key);
}
//# sourceMappingURL=keys.js.map