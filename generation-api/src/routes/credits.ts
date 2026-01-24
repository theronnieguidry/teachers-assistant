import { Router, type Response } from "express";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { getCredits } from "../services/credits.js";

const router = Router();

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
