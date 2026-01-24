import "dotenv/config";
import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth.js";
import healthRouter from "./routes/health.js";
import generateRouter from "./routes/generate.js";
import creditsRouter from "./routes/credits.js";
import pdfRouter from "./routes/pdf.js";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Public routes
app.use("/health", healthRouter);

// Protected routes
app.use("/generate", authMiddleware, generateRouter);
app.use("/credits", authMiddleware, creditsRouter);
app.use("/pdf", authMiddleware, pdfRouter);

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
  app.listen(PORT, () => {
    console.log(`Generation API running on port ${PORT}`);
  });
}

export { app };
