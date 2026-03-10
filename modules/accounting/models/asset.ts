export interface Asset {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  maxSupply?: bigint;
  mintAuthority?: string;
  soulbound?: boolean;
}
