import { hexToBin } from "@bitauth/libauth";

export function privateKeyToBin(key: string): Uint8Array {
  return hexToBin(key);
}