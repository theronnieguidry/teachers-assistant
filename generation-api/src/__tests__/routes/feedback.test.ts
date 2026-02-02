import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import {
  authMiddleware,
  resetClient as resetAuthClient,
} from "../../middleware/auth.js";
import feedbackRouter from "../../routes/feedback.js";

// Mock Supabase for auth
const mockGetUser = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock global fetch for GitHub API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Feedback Route", () => {
  const app = express();
  app.use(express.json());
  app.use("/feedback", authMiddleware, feedbackRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthClient();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    process.env.GITHUB_FEEDBACK_TOKEN = "ghp_test_token";
    process.env.GITHUB_REPO_OWNER = "testowner";
    process.env.GITHUB_REPO_NAME = "testrepo";
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.GITHUB_FEEDBACK_TOKEN;
    delete process.env.GITHUB_REPO_OWNER;
    delete process.env.GITHUB_REPO_NAME;
  });

  describe("Authentication", () => {
    it("should return 401 without authorization header", async () => {
      const response = await request(app).post("/feedback").send({
        type: "bug",
        title: "Test bug report",
        description: "This is a detailed bug description for testing",
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Missing or invalid authorization header");
    });

    it("should return 401 with invalid token", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Invalid token" },
      });

      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer invalid-token")
        .send({
          type: "bug",
          title: "Test bug report",
          description: "This is a detailed bug description for testing",
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid or expired token");
    });
  });

  describe("Validation", () => {
    beforeEach(() => {
      // Set up valid auth for all validation tests
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
    });

    it("should return 400 when type is missing", async () => {
      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          title: "Test bug report",
          description: "This is a detailed bug description for testing",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 when type is invalid", async () => {
      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "invalid",
          title: "Test bug report",
          description: "This is a detailed bug description for testing",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 when title is missing", async () => {
      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          description: "This is a detailed bug description for testing",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 when title is too short", async () => {
      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Hi",
          description: "This is a detailed bug description for testing",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          path: ["title"],
          message: "Title must be at least 5 characters",
        })
      );
    });

    it("should return 400 when description is missing", async () => {
      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Valid title here",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });

    it("should return 400 when description is too short", async () => {
      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Valid title here",
          description: "Too short",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          path: ["description"],
          message: "Description must be at least 20 characters",
        })
      );
    });

    it("should return 400 when contactEmail is invalid", async () => {
      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Valid title here",
          description: "This is a valid description with enough characters",
          contactEmail: "not-an-email",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid request");
    });
  });

  describe("GitHub Integration", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
    });

    it("should create a bug report issue successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          number: 42,
          html_url: "https://github.com/testowner/testrepo/issues/42",
        }),
      });

      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Test bug report",
          description: "This is a detailed bug description for testing purposes",
          appVersion: "1.0.0",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.issueNumber).toBe(42);
      expect(response.body.issueUrl).toBe(
        "https://github.com/testowner/testrepo/issues/42"
      );

      // Verify the GitHub API was called correctly
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testowner/testrepo/issues",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer ghp_test_token",
            Accept: "application/vnd.github+json",
          }),
        })
      );

      // Verify the issue body contains the bug label
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.title).toContain("[Bug Report]");
      expect(body.labels).toContain("bug");
    });

    it("should create a feature request issue successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          number: 43,
          html_url: "https://github.com/testowner/testrepo/issues/43",
        }),
      });

      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "feature",
          title: "Test feature request",
          description: "This is a detailed feature request for testing purposes",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.issueNumber).toBe(43);

      // Verify the issue has enhancement label
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.title).toContain("[Feature Request]");
      expect(body.labels).toContain("enhancement");
    });

    it("should include contact email in issue body when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          number: 44,
          html_url: "https://github.com/testowner/testrepo/issues/44",
        }),
      });

      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Test bug with contact",
          description: "This is a detailed bug description for testing purposes",
          contactEmail: "different@email.com",
        });

      expect(response.status).toBe(201);

      // Verify the issue body contains the contact email
      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.body).toContain("different@email.com");
    });

    it("should return 500 when GitHub API fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Bad credentials",
      });

      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Test bug report",
          description: "This is a detailed bug description for testing purposes",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to submit feedback");
    });

    it("should return 500 when GITHUB_FEEDBACK_TOKEN is not configured", async () => {
      delete process.env.GITHUB_FEEDBACK_TOKEN;

      const response = await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Test bug report",
          description: "This is a detailed bug description for testing purposes",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Feedback service not configured");
    });
  });

  describe("Issue Body Format", () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          number: 50,
          html_url: "https://github.com/testowner/testrepo/issues/50",
        }),
      });
    });

    it("should include user email in issue body", async () => {
      await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Test formatting",
          description: "Testing the issue body format with adequate length",
        });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.body).toContain("test@example.com");
    });

    it("should include app version in issue body", async () => {
      await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "feature",
          title: "Test version",
          description: "Testing app version inclusion in the issue body",
          appVersion: "2.1.0",
        });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.body).toContain("2.1.0");
    });

    it("should include timestamp in issue body", async () => {
      const beforeTime = new Date().toISOString().slice(0, 10);

      await request(app)
        .post("/feedback")
        .set("Authorization", "Bearer valid-token")
        .send({
          type: "bug",
          title: "Test timestamp",
          description: "Testing timestamp inclusion in the issue body",
        });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      // Should contain today's date in ISO format
      expect(body.body).toContain(beforeTime);
    });
  });
});
