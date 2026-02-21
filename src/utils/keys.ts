import { fromHex } from "./hex.js";

export function privateKeyToBin(key: string): Uint8Array {
  return fromHex(key);
}
