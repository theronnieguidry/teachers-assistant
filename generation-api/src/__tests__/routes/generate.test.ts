import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { authMiddleware, resetClient as resetAuthClient } from "../../middleware/auth.js";
import generateRouter from "../../routes/generate.js";

// Mock auth
const mockGetUser = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock generator service
const mockGenerateTeacherPack = vi.fn();

vi.mock("../../services/generator.js", () => ({
  generateTeacherPack: (...args: unknown[]) => mockGenerateTeacherPack(...args),
}));

describe("Generate Route", () => {
  const app = express();
  app.use(express.json());
  app.use("/generate", authMiddleware, generateRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthClient();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  const validRequestBody = {
    projectId: "project-123",
    prompt: "Create a math worksheet about addition for 2nd grade",
    grade: "2",
    subject: "Math",
    options: {
      questionCount: 10,
      includeVisuals: true,
      difficulty: "medium",
    },
  };

  it("should return 401 without auth", async () => {
    const response = await request(app).post("/generate").send(validRequestBody);

    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid request body", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send({
        // Missing required fields
        prompt: "short", // Too short
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
    expect(response.body.details).toBeDefined();
  });

  it("should validate projectId is required", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send({
        ...validRequestBody,
        projectId: undefined,
      });

    expect(response.status).toBe(400);
  });

  it("should validate prompt length", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send({
        ...validRequestBody,
        prompt: "too short",
      });

    expect(response.status).toBe(400);
  });

  it("should validate grade is valid", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send({
        ...validRequestBody,
        grade: "10", // Invalid grade
      });

    expect(response.status).toBe(400);
  });

  it("should call generateTeacherPack with valid request", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockGenerateTeacherPack.mockResolvedValue({
      projectId: "project-123",
      versionId: "version-456",
      worksheetHtml: "<html>Worksheet</html>",
      lessonPlanHtml: "",
      answerKeyHtml: "<html>Answers</html>",
      creditsUsed: 5,
    });

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send(validRequestBody);

    // Route uses SSE streaming - returns 200 with text/event-stream
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");

    // Parse SSE response to find the complete event
    const sseData = response.text;
    expect(sseData).toContain("data:");
    expect(sseData).toContain('"type":"complete"');
    expect(sseData).toContain('"projectId":"project-123"');

    expect(mockGenerateTeacherPack).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-123",
        prompt: validRequestBody.prompt,
        grade: "2",
        subject: "Math",
      }),
      "user-123",
      expect.objectContaining({
        aiProvider: "openai",
      }),
      expect.any(Function)
    );
  });

  it("should return error event for insufficient credits via SSE", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockGenerateTeacherPack.mockRejectedValue(new Error("Insufficient credits"));

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send(validRequestBody);

    // SSE is set up before generateTeacherPack is called, so errors come as SSE events
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain('"type":"error"');
    expect(response.text).toContain("Insufficient credits");
  });

  it("should return error event for generation errors via SSE", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockGenerateTeacherPack.mockRejectedValue(new Error("AI provider error"));

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send(validRequestBody);

    // SSE is set up before generateTeacherPack is called, so errors come as SSE events
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain('"type":"error"');
    expect(response.text).toContain("AI provider error");
  });

  it("should accept optional aiProvider parameter", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockGenerateTeacherPack.mockResolvedValue({
      projectId: "project-123",
      versionId: "version-456",
      worksheetHtml: "<html>Worksheet</html>",
      lessonPlanHtml: "",
      answerKeyHtml: "",
      creditsUsed: 5,
    });

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send({
        ...validRequestBody,
        aiProvider: "openai",
      });

    expect(response.status).toBe(200);
    expect(mockGenerateTeacherPack).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        aiProvider: "openai",
      }),
      expect.any(Function)
    );
  });

  it("should accept inspiration items", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockGenerateTeacherPack.mockResolvedValue({
      projectId: "project-123",
      versionId: "version-456",
      worksheetHtml: "<html>Worksheet</html>",
      lessonPlanHtml: "",
      answerKeyHtml: "",
      creditsUsed: 5,
    });

    const response = await request(app)
      .post("/generate")
      .set("Authorization", "Bearer valid-token")
      .send({
        ...validRequestBody,
        inspiration: [
          {
            id: "insp-1",
            type: "url",
            title: "Example",
            sourceUrl: "https://example.com",
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(mockGenerateTeacherPack).toHaveBeenCalledWith(
      expect.objectContaining({
        inspiration: expect.arrayContaining([
          expect.objectContaining({
            id: "insp-1",
            type: "url",
          }),
        ]),
      }),
      expect.anything(),
      expect.anything(),
      expect.any(Function)
    );
  });
});
