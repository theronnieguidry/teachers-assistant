import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { authMiddleware, resetClient as resetAuthClient } from "../../middleware/auth.js";
import creditsRouter from "../../routes/credits.js";
import { resetClient as resetCreditsClient } from "../../services/credits.js";

// Mock Supabase for auth
const mockGetUser = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockLimit = vi.fn();
const mockSingle = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
    })),
  })),
}));

describe("Credits Route", () => {
  const app = express();
  app.use(express.json());
  app.use("/credits", authMiddleware, creditsRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthClient();
    resetCreditsClient();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("should return 401 without auth", async () => {
    const response = await request(app).get("/credits");

    expect(response.status).toBe(401);
  });

  it("should return user credits when authenticated", async () => {
    // Mock auth
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    // Mock credits fetch
    mockSingle.mockResolvedValue({
      data: {
        balance: 50,
        lifetime_granted: 100,
        lifetime_used: 50,
      },
      error: null,
    });

    const response = await request(app)
      .get("/credits")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.credits).toEqual({
      balance: 50,
      lifetimeGranted: 100,
      lifetimeUsed: 50,
    });
  });

  it("should return 500 when credits fetch fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Database error" },
    });

    const response = await request(app)
      .get("/credits")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch credits");
  });

  it("should return recent ledger entries when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockLimit.mockResolvedValue({
      data: [
        {
          id: "tx-1",
          amount: -5,
          transaction_type: "generation",
          description: "Credits reserved for project generation",
          project_id: "project-1",
          created_at: "2026-02-12T02:00:00Z",
        },
        {
          id: "tx-2",
          amount: -3,
          transaction_type: "generation",
          description: "Generation complete",
          project_id: "project-1",
          created_at: "2026-02-12T02:01:00Z",
        },
        {
          id: "tx-3",
          amount: 3,
          transaction_type: "refund",
          description: "Quality gate failed",
          project_id: "project-1",
          created_at: "2026-02-12T02:02:00Z",
        },
      ],
      error: null,
    });

    const response = await request(app)
      .get("/credits/ledger?limit=3")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.entries).toHaveLength(3);
    expect(response.body.entries[0]).toMatchObject({
      id: "tx-1",
      type: "reserve",
      amount: -5,
    });
    expect(response.body.entries[1]).toMatchObject({
      id: "tx-2",
      type: "deduct",
      amount: -3,
    });
    expect(response.body.entries[2]).toMatchObject({
      id: "tx-3",
      type: "refund",
      amount: 3,
    });
    expect(mockLimit).toHaveBeenCalledWith(3);
  });

  it("should return 500 when ledger fetch fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockLimit.mockResolvedValue({
      data: null,
      error: { message: "Ledger query failed" },
    });

    const response = await request(app)
      .get("/credits/ledger")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Failed to fetch credits ledger");
  });
});
