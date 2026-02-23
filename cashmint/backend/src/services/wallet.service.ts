import { WalletInfo } from "../../../shared/types.js";

export async function getWalletInfo(address: string): Promise<WalletInfo> {
  // Placeholder – replace with real RPC/Chronik call
  return {
    address,
    bchBalance: 0,
    tokens: [],
    utxos: [],
  };
}

export async function listWallets(): Promise<string[]> {
  // Placeholder – return known wallet addresses
  return [];
}
