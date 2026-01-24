import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { authMiddleware, resetClient } from "../../middleware/auth.js";

// Mock Supabase client
const mockGetUser = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

describe("Auth Middleware", () => {
  const app = express();
  app.use(express.json());

  // Test route that requires auth
  app.get("/protected", authMiddleware, (req, res) => {
    res.json({
      userId: (req as unknown as { userId: string }).userId,
      userEmail: (req as unknown as { userEmail: string }).userEmail,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetClient();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it("should reject requests without authorization header", async () => {
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing or invalid authorization header");
  });

  it("should reject requests with invalid authorization format", async () => {
    const response = await request(app)
      .get("/protected")
      .set("Authorization", "InvalidFormat token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Missing or invalid authorization header");
  });

  it("should reject requests with invalid token", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Invalid token" },
    });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid or expired token");
  });

  it("should allow requests with valid token and attach user info", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "test@example.com",
        },
      },
      error: null,
    });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe("user-123");
    expect(response.body.userEmail).toBe("test@example.com");
  });

  it("should handle user without email", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: undefined,
        },
      },
      error: null,
    });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.userId).toBe("user-123");
  });
});
