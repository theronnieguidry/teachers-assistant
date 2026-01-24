import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import polishRouter from "../../routes/polish.js";

// Mock the prompt polisher service
const mockPolishPrompt = vi.fn();

vi.mock("../../services/prompt-polisher.js", () => ({
  polishPrompt: (...args: unknown[]) => mockPolishPrompt(...args),
}));

describe("Polish Route", () => {
  const app = express();
  app.use(express.json());
  app.use("/polish", polishRouter);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const validRequestBody = {
    prompt: "Math worksheet about fractions",
    grade: "3",
    subject: "Math",
    format: "worksheet",
    questionCount: 10,
    difficulty: "medium",
    includeVisuals: true,
  };

  describe("Request Validation", () => {
    it("should return 400 for missing prompt", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          prompt: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
      expect(response.body.details).toBeDefined();
    });

    it("should return 400 for empty prompt", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          prompt: "",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for invalid grade value", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          grade: "10", // Invalid grade
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for missing grade", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          grade: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for invalid format value", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          format: "quiz", // Invalid format
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for invalid difficulty value", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          difficulty: "extreme", // Invalid difficulty
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for questionCount less than 1", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          questionCount: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for questionCount greater than 50", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          questionCount: 51,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for non-integer questionCount", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          questionCount: 10.5,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for missing includeVisuals", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          includeVisuals: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for non-boolean includeVisuals", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          includeVisuals: "yes", // Should be boolean
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for missing subject", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          subject: undefined,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 for empty subject", async () => {
      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          subject: "",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });
  });

  describe("Successful Polishing", () => {
    it("should return polished prompt successfully", async () => {
      const polishedPrompt = "Create a comprehensive math worksheet about fractions for 3rd graders...";
      mockPolishPrompt.mockResolvedValue(polishedPrompt);

      const response = await request(app).post("/polish").send(validRequestBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        original: validRequestBody.prompt,
        polished: polishedPrompt,
        wasPolished: true,
      });
    });

    it("should return wasPolished: true when prompt was enhanced", async () => {
      const originalPrompt = "Math fractions";
      const polishedPrompt = "Create a math worksheet about fractions with visual fraction bars...";
      mockPolishPrompt.mockResolvedValue(polishedPrompt);

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          prompt: originalPrompt,
        });

      expect(response.status).toBe(200);
      expect(response.body.wasPolished).toBe(true);
      expect(response.body.original).toBe(originalPrompt);
      expect(response.body.polished).toBe(polishedPrompt);
    });

    it("should return wasPolished: false when prompt was not changed", async () => {
      const originalPrompt = "Create a detailed math worksheet about fractions";
      // Polisher returns same prompt (e.g., already detailed or polishing disabled)
      mockPolishPrompt.mockResolvedValue(originalPrompt);

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          prompt: originalPrompt,
        });

      expect(response.status).toBe(200);
      expect(response.body.wasPolished).toBe(false);
      expect(response.body.original).toBe(originalPrompt);
      expect(response.body.polished).toBe(originalPrompt);
    });

    it("should call polishPrompt with correct context", async () => {
      mockPolishPrompt.mockResolvedValue("polished");

      await request(app).post("/polish").send(validRequestBody);

      expect(mockPolishPrompt).toHaveBeenCalledWith({
        prompt: validRequestBody.prompt,
        grade: validRequestBody.grade,
        subject: validRequestBody.subject,
        format: validRequestBody.format,
        questionCount: validRequestBody.questionCount,
        difficulty: validRequestBody.difficulty,
        includeVisuals: validRequestBody.includeVisuals,
        inspirationTitles: undefined,
      });
    });
  });

  describe("Optional Fields", () => {
    it("should accept optional inspirationTitles array", async () => {
      mockPolishPrompt.mockResolvedValue("polished prompt");

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          inspirationTitles: ["Example PDF", "Math Article"],
        });

      expect(response.status).toBe(200);
      expect(mockPolishPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          inspirationTitles: ["Example PDF", "Math Article"],
        })
      );
    });

    it("should handle empty inspirationTitles array", async () => {
      mockPolishPrompt.mockResolvedValue("polished prompt");

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          inspirationTitles: [],
        });

      expect(response.status).toBe(200);
      expect(mockPolishPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          inspirationTitles: [],
        })
      );
    });

    it("should work without inspirationTitles", async () => {
      mockPolishPrompt.mockResolvedValue("polished prompt");

      const response = await request(app).post("/polish").send(validRequestBody);

      expect(response.status).toBe(200);
    });
  });

  describe("All Valid Grade Levels", () => {
    const validGrades = ["K", "1", "2", "3", "4", "5", "6"];

    validGrades.forEach((grade) => {
      it(`should accept grade "${grade}"`, async () => {
        mockPolishPrompt.mockResolvedValue("polished");

        const response = await request(app)
          .post("/polish")
          .send({
            ...validRequestBody,
            grade,
          });

        expect(response.status).toBe(200);
      });
    });
  });

  describe("All Valid Formats", () => {
    const validFormats = ["worksheet", "lesson_plan", "both"];

    validFormats.forEach((format) => {
      it(`should accept format "${format}"`, async () => {
        mockPolishPrompt.mockResolvedValue("polished");

        const response = await request(app)
          .post("/polish")
          .send({
            ...validRequestBody,
            format,
          });

        expect(response.status).toBe(200);
      });
    });
  });

  describe("All Valid Difficulty Levels", () => {
    const validDifficulties = ["easy", "medium", "hard"];

    validDifficulties.forEach((difficulty) => {
      it(`should accept difficulty "${difficulty}"`, async () => {
        mockPolishPrompt.mockResolvedValue("polished");

        const response = await request(app)
          .post("/polish")
          .send({
            ...validRequestBody,
            difficulty,
          });

        expect(response.status).toBe(200);
      });
    });
  });

  describe("Error Handling", () => {
    it("should return 500 when polishPrompt throws an error", async () => {
      mockPolishPrompt.mockRejectedValue(new Error("Ollama connection failed"));

      const response = await request(app).post("/polish").send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to polish prompt");
      expect(response.body.message).toBe("Ollama connection failed");
    });

    it("should return 500 with unknown error message for non-Error throws", async () => {
      mockPolishPrompt.mockRejectedValue("some string error");

      const response = await request(app).post("/polish").send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to polish prompt");
      expect(response.body.message).toBe("Unknown error");
    });

    it("should handle timeout errors gracefully", async () => {
      mockPolishPrompt.mockRejectedValue(new Error("timeout"));

      const response = await request(app).post("/polish").send(validRequestBody);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to polish prompt");
    });
  });

  describe("Edge Cases", () => {
    it("should handle questionCount at minimum boundary (1)", async () => {
      mockPolishPrompt.mockResolvedValue("polished");

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          questionCount: 1,
        });

      expect(response.status).toBe(200);
    });

    it("should handle questionCount at maximum boundary (50)", async () => {
      mockPolishPrompt.mockResolvedValue("polished");

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          questionCount: 50,
        });

      expect(response.status).toBe(200);
    });

    it("should handle includeVisuals false", async () => {
      mockPolishPrompt.mockResolvedValue("polished");

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          includeVisuals: false,
        });

      expect(response.status).toBe(200);
      expect(mockPolishPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          includeVisuals: false,
        })
      );
    });

    it("should handle very long prompts", async () => {
      const longPrompt = "A".repeat(1000);
      mockPolishPrompt.mockResolvedValue(longPrompt);

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          prompt: longPrompt,
        });

      expect(response.status).toBe(200);
    });

    it("should handle special characters in prompt", async () => {
      const specialPrompt = "Math <script>alert('xss')</script> & fractions";
      mockPolishPrompt.mockResolvedValue("polished");

      const response = await request(app)
        .post("/polish")
        .send({
          ...validRequestBody,
          prompt: specialPrompt,
        });

      expect(response.status).toBe(200);
    });
  });
});
