import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import improveRouter from "../../routes/improve.js";

// Mock the auth middleware
vi.mock("../../middleware/auth.js", () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    (req as unknown as { userId: string }).userId = "test-user-123";
    next();
  },
}));

// Mock Supabase
const mockSingleResult = vi.fn();
const mockInsertResult = vi.fn();
const mockUpdateResult = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockInsertResult,
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: mockUpdateResult,
      }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: mockSingleResult,
    })),
  })),
}));

// Mock the improvement service
vi.mock("../../services/premium/improvement-service.js", () => ({
  improvementService: {
    getCreditCost: vi.fn().mockReturnValue(2),
    applyImprovement: vi.fn().mockResolvedValue({
      improvedHtml: "<html><body>Improved content</body></html>",
      changes: ["Simplified vocabulary"],
      creditsUsed: 2,
    }),
  },
  ImprovementService: vi.fn(),
}));

// Mock credits service
vi.mock("../../services/credits.js", () => ({
  reserveCredits: vi.fn().mockResolvedValue("reservation-123"),
  deductCredits: vi.fn().mockResolvedValue(undefined),
  refundCredits: vi.fn().mockResolvedValue(undefined),
}));

describe("Improve Route", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/improve", improveRouter);

    // Default mock responses
    mockSingleResult.mockResolvedValue({
      data: {
        id: "project-123",
        user_id: "test-user-123",
        grade: "2",
        subject: "Math",
        options: {},
      },
      error: null,
    });

    mockInsertResult.mockResolvedValue({
      data: {
        id: "new-version-456",
        version_number: 2,
      },
      error: null,
    });

    mockUpdateResult.mockReturnValue({ error: null });
  });

  describe("POST /improve", () => {
    it("should apply improvement and return new version", async () => {
      // Mock version lookup
      mockSingleResult
        .mockResolvedValueOnce({
          data: {
            id: "project-123",
            user_id: "test-user-123",
            grade: "2",
            subject: "Math",
            options: {},
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: "version-123",
            worksheet_html: "<html>Original</html>",
            lesson_plan_html: null,
            answer_key_html: null,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { version_number: 1 },
          error: null,
        });

      const response = await request(app)
        .post("/improve")
        .send({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          versionId: "550e8400-e29b-41d4-a716-446655440001",
          improvementType: "simplify",
          targetDocument: "worksheet",
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("newVersionId");
      expect(response.body).toHaveProperty("creditsUsed");
      expect(response.body).toHaveProperty("changes");
    });

    it("should return 400 for invalid improvement type", async () => {
      const response = await request(app)
        .post("/improve")
        .send({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          versionId: "550e8400-e29b-41d4-a716-446655440001",
          improvementType: "invalid_type",
          targetDocument: "worksheet",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 for invalid target document", async () => {
      const response = await request(app)
        .post("/improve")
        .send({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          versionId: "550e8400-e29b-41d4-a716-446655440001",
          improvementType: "simplify",
          targetDocument: "invalid_document",
        });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid UUID", async () => {
      const response = await request(app)
        .post("/improve")
        .send({
          projectId: "not-a-uuid",
          versionId: "550e8400-e29b-41d4-a716-446655440001",
          improvementType: "simplify",
          targetDocument: "worksheet",
        });

      expect(response.status).toBe(400);
    });

    it("should return 404 when project not found", async () => {
      mockSingleResult.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST116", message: "Not found" },
      });

      const response = await request(app)
        .post("/improve")
        .send({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          versionId: "550e8400-e29b-41d4-a716-446655440001",
          improvementType: "simplify",
          targetDocument: "worksheet",
        });

      expect(response.status).toBe(404);
    });

    it("should accept additional instructions", async () => {
      mockSingleResult
        .mockResolvedValueOnce({
          data: {
            id: "project-123",
            user_id: "test-user-123",
            grade: "2",
            subject: "Math",
            options: {},
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: "version-123",
            worksheet_html: "<html>Original</html>",
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { version_number: 1 },
          error: null,
        });

      const response = await request(app)
        .post("/improve")
        .send({
          projectId: "550e8400-e29b-41d4-a716-446655440000",
          versionId: "550e8400-e29b-41d4-a716-446655440001",
          improvementType: "fix_confusing",
          targetDocument: "worksheet",
          additionalInstructions: "Focus on question 3 which seems unclear",
        });

      expect(response.status).toBe(200);
    });
  });

  describe("GET /improve/estimate", () => {
    it("should return credit cost for improvement type", async () => {
      const response = await request(app)
        .get("/improve/estimate?type=simplify");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("improvementType", "simplify");
      expect(response.body).toHaveProperty("creditCost");
      expect(response.body).toHaveProperty("description");
    });

    it("should return 400 for missing type parameter", async () => {
      const response = await request(app)
        .get("/improve/estimate");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should return 400 for invalid improvement type", async () => {
      const response = await request(app)
        .get("/improve/estimate?type=invalid");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("validTypes");
    });

    it("should return correct cost for add_visuals", async () => {
      const { improvementService } = await import("../../services/premium/improvement-service.js");
      (improvementService.getCreditCost as ReturnType<typeof vi.fn>).mockReturnValue(4);

      const response = await request(app)
        .get("/improve/estimate?type=add_visuals");

      expect(response.status).toBe(200);
      expect(response.body.improvementType).toBe("add_visuals");
    });
  });
});
