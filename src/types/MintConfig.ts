export interface MintConfig {
  network: "mainnet" | "testnet" | "regtest";
  privateKey: string;
  feeRate?: number;
}
