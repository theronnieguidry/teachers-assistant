import "dotenv/config";
import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth.js";
import healthRouter from "./routes/health.js";
import generateRouter from "./routes/generate.js";
import creditsRouter from "./routes/credits.js";
import pdfRouter from "./routes/pdf.js";
import polishRouter from "./routes/polish.js";
import feedbackRouter from "./routes/feedback.js";
import checkoutRouter, { handleWebhook } from "./routes/checkout.js";
import estimateRouter from "./routes/estimate.js";
import improveRouter from "./routes/improve.js";
import curriculumRouter from "./routes/curriculum.js";
import { warmupLocalModel } from "./services/ollama-model-manager.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());

// Stripe webhook needs raw body BEFORE json middleware
app.post(
  "/checkout/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

app.use(express.json({ limit: "10mb" }));

// Public routes
app.use("/health", healthRouter);

// Protected routes
app.use("/generate", authMiddleware, generateRouter);
app.use("/estimate", authMiddleware, estimateRouter);
app.use("/improve", improveRouter);
app.use("/credits", authMiddleware, creditsRouter);
app.use("/pdf", authMiddleware, pdfRouter);
app.use("/polish", authMiddleware, polishRouter);
app.use("/feedback", authMiddleware, feedbackRouter);
app.use("/checkout", authMiddleware, checkoutRouter);
app.use("/curriculum", authMiddleware, curriculumRouter);

// Error handling
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

// Start server
if (process.env.NODE_ENV !== "test") {
  const start = async () => {
    try {
      console.log("[startup] Running Ollama local-model warmup...");
      const state = await warmupLocalModel();
      if (state.localModelReady && state.activeModel) {
        console.log(`[startup] Local model ready: ${state.activeModel}`);
      } else {
        console.warn(
          `[startup] Local model not ready: ${state.lastError || "unknown reason"}`
        );
      }
    } catch (error) {
      console.warn("[startup] Ollama warmup failed:", error);
    }

    app.listen(PORT, () => {
      console.log(`Generation API running on port ${PORT}`);
    });
  };

  void start();
}

export { app };
