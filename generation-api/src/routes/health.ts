import { Router, type Request, type Response } from "express";
import { getOllamaWarmupState } from "../services/ollama-model-manager.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const ollamaState = getOllamaWarmupState();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "0.1.0",
    ollamaReachable: ollamaState.reachable,
    localModelReady: ollamaState.localModelReady,
    activeLocalModel: ollamaState.activeModel,
    warmingUp: ollamaState.warmingUp,
  });
});

export default router;
