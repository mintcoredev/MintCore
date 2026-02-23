import { Router } from "express";
import { listWalletsHandler, getWallet } from "../controllers/wallets.controller.js";

const router = Router();
router.get("/", listWalletsHandler);
router.get("/:address", getWallet);
export default router;
