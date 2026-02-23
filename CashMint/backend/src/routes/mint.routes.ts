import { Router } from "express";
import { mint } from "../controllers/mint.controller.js";

const router = Router();
router.post("/", mint);
export default router;
