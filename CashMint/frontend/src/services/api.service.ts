import type {
  HealthStatus,
  MintRequest,
  MintResponse,
  Token,
  ValidationResult,
  WalletInfo,
} from "../../shared/types.js";

const BASE_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>("/health");
  },

  mintToken(body: MintRequest): Promise<MintResponse> {
    return request<MintResponse>("/mint", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  getTokens(): Promise<Token[]> {
    return request<Token[]>("/tokens");
  },

  getToken(id: string): Promise<Token> {
    return request<Token>(`/tokens/${id}`);
  },

  validateToken(tokenId: string): Promise<ValidationResult> {
    return request<ValidationResult>("/tokens/validate", {
      method: "POST",
      body: JSON.stringify({ tokenId }),
    });
  },

  getWallet(address: string): Promise<WalletInfo> {
    return request<WalletInfo>(`/wallets/${address}`);
  },
};
