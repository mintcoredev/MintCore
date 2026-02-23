import { Request, Response, NextFunction } from "express";
import { mintTokens } from "../services/mintcore.service.js";
import { addToken } from "../services/token.service.js";
import { validateMintRequest } from "../utils/validators.js";

export async function mint(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!validateMintRequest(req.body)) {
      res.status(400).json({ error: "Invalid mint request body" });
      return;
    }
    const result = await mintTokens(req.body);
    addToken({
      id: result.tokenId,
      type: req.body.type,
      metadata: req.body.metadata,
      amount: req.body.amount,
      createdAt: new Date().toISOString(),
      rawTx: result.rawTx,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
