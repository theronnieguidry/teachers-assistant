import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import estimateRouter from "../../routes/estimate.js";

describe("POST /estimate", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    // Inject userId on every request (estimate route checks req.userId directly)
    app.use((req: any, _res: any, next: any) => {
      req.userId = "test-user-123";
      next();
    });
    app.use("/estimate", estimateRouter);
  });

  it("should return estimate for basic worksheet request", async () => {
    const response = await request(app)
      .post("/estimate")
      .send({
        grade: "2",
        subject: "Math",
        options: {
          questionCount: 10,
          includeVisuals: false,
          difficulty: "medium",
          format: "worksheet",
          includeAnswerKey: true,
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("estimate");
    expect(response.body.estimate).toHaveProperty("minCredits");
    expect(response.body.estimate).toHaveProperty("maxCredits");
    expect(response.body.estimate).toHaveProperty("expectedCredits");
    expect(response.body).toHaveProperty("disclaimer");
  });

  it("should return higher estimate when visuals are included", async () => {
    const withoutVisuals = await request(app)
      .post("/estimate")
      .send({
        grade: "1",
        subject: "Reading",
        options: {
          questionCount: 10,
          includeVisuals: false,
          format: "worksheet",
        },
      });

    const withVisuals = await request(app)
      .post("/estimate")
      .send({
        grade: "1",
        subject: "Reading",
        options: {
          questionCount: 10,
          includeVisuals: true,
          format: "worksheet",
        },
        visualSettings: {
          includeVisuals: true,
          richness: "standard",
          style: "friendly_cartoon",
        },
      });

    expect(withVisuals.status).toBe(200);
    expect(withVisuals.body.estimate.expectedCredits).toBeGreaterThanOrEqual(
      withoutVisuals.body.estimate.expectedCredits
    );
  });

  it("should return estimate with breakdown for visual settings", async () => {
    const response = await request(app)
      .post("/estimate")
      .send({
        grade: "K",
        subject: "Math",
        options: {
          questionCount: 8,
          includeVisuals: true,
          format: "both",
        },
        visualSettings: {
          includeVisuals: true,
          richness: "rich",
          style: "friendly_cartoon",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.estimate).toHaveProperty("breakdown");
    expect(response.body.estimate.breakdown).toHaveProperty("textGeneration");
    expect(response.body.estimate.breakdown).toHaveProperty("imageGeneration");
  });

  it("should return 400 for invalid request body", async () => {
    const response = await request(app)
      .post("/estimate")
      .send({
        // Missing required fields
        subject: "Math",
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  it("should return 400 for invalid grade", async () => {
    const response = await request(app)
      .post("/estimate")
      .send({
        grade: "12", // Invalid grade for K-6
        subject: "Math",
        options: {
          questionCount: 10,
        },
      });

    expect(response.status).toBe(400);
  });

  it("should handle premium_plan_pipeline generation mode", async () => {
    const response = await request(app)
      .post("/estimate")
      .send({
        grade: "3",
        subject: "Science",
        options: {
          questionCount: 10,
          format: "both",
        },
        generationMode: "premium_plan_pipeline",
      });

    expect(response.status).toBe(200);
    expect(response.body.estimate.expectedCredits).toBeGreaterThan(0);
  });

  it("should include quality gate in breakdown for premium mode", async () => {
    const response = await request(app)
      .post("/estimate")
      .send({
        grade: "2",
        subject: "Math",
        options: {
          questionCount: 10,
          format: "worksheet",
        },
        generationMode: "premium_plan_pipeline",
        visualSettings: {
          includeVisuals: false,
          richness: "minimal",
          style: "simple_icons",
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.estimate.breakdown).toHaveProperty("qualityGate");
  });
});
