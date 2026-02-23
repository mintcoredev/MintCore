import { Router } from "express";
import { listTokens, getToken, validateTokenHandler } from "../controllers/tokens.controller.js";

const router = Router();
router.get("/", listTokens);
router.get("/:id", getToken);
router.post("/validate", validateTokenHandler);
export default router;
