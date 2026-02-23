import { Request, Response, NextFunction } from "express";
import { getAllTokens, getTokenById } from "../services/token.service.js";
import { validateToken } from "../services/mintcore.service.js";

export function listTokens(_req: Request, res: Response): void {
  res.json(getAllTokens());
}

export function getToken(req: Request, res: Response): void {
  const token = getTokenById(req.params.id);
  if (!token) {
    res.status(404).json({ error: "Token not found" });
    return;
  }
  res.json(token);
}

export async function validateTokenHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tokenId } = req.body as { tokenId?: string };
    if (!tokenId) {
      res.status(400).json({ error: "tokenId is required" });
      return;
    }
    const result = await validateToken(tokenId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
