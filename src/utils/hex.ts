export const toHex = (buffer: Uint8Array): string =>
  Array.from(buffer)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

export const fromHex = (hex: string): Uint8Array =>
  new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
