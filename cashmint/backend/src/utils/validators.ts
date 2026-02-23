import { MintRequest } from "../../../shared/types.js";

export function validateMintRequest(body: unknown): body is MintRequest {
  if (!body || typeof body !== "object") return false;
  const req = body as Record<string, unknown>;
  if (req.type !== "fungible" && req.type !== "nft") return false;
  if (!req.metadata || typeof req.metadata !== "object") return false;
  if (req.amount !== undefined && (typeof req.amount !== "number" || req.amount <= 0)) return false;
  return true;
}
