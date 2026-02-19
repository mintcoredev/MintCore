export interface TokenSchema {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  metadata?: Record<string, any>;
}
