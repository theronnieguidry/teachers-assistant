import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { getCredits, getCreditsLedger } from "../services/credits.js";

const router = Router();

router.get("/ledger", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const rawLimit = typeof req.query.limit === "string" ? Number(req.query.limit) : 20;
    const limit = Number.isFinite(rawLimit) ? rawLimit : 20;
    const entries = await getCreditsLedger(req.userId, limit);

    res.json({
      success: true,
      entries,
    });
  } catch (error) {
    console.error("Credits ledger fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch credits ledger",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const credits = await getCredits(req.userId);

    res.json({
      success: true,
      credits,
    });
  } catch (error) {
    console.error("Credits fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch credits",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
