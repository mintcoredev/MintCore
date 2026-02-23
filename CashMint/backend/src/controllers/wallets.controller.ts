import { Request, Response, NextFunction } from "express";
import { getWalletInfo, listWallets } from "../services/wallet.service.js";

export async function listWalletsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const wallets = await listWallets();
    res.json(wallets);
  } catch (err) {
    next(err);
  }
}

export async function getWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const info = await getWalletInfo(req.params.address);
    res.json(info);
  } catch (err) {
    next(err);
  }
}
