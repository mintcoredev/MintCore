import { Token } from "../../../shared/types.js";

const tokens: Token[] = [];

export function addToken(token: Token): void {
  tokens.push(token);
}

export function getAllTokens(): Token[] {
  return [...tokens];
}

export function getTokenById(id: string): Token | undefined {
  return tokens.find((t) => t.id === id);
}
