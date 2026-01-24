import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import healthRouter from "../../routes/health.js";

describe("Health Route", () => {
  const app = express();
  app.use("/health", healthRouter);

  it("should return status ok", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("should return a timestamp", async () => {
    const response = await request(app).get("/health");

    expect(response.body.timestamp).toBeDefined();
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });

  it("should return version", async () => {
    const response = await request(app).get("/health");

    expect(response.body.version).toBeDefined();
  });
});
