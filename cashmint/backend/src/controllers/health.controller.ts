import { Request, Response } from "express";

const MINTCORE_VERSION = "0.1.0";

export function getHealth(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    mintcoreVersion: MINTCORE_VERSION,
    timestamp: new Date().toISOString(),
  });
}
