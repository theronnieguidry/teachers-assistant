import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getCredits, reserveCredits, refundCredits, resetClient } from "../../services/credits.js";

// Create chainable mock builder
const createMockBuilder = (data: unknown = null, error: unknown = null) => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnValue({ error: null }),
  };
  return builder;
};

let mockBuilder = createMockBuilder();
const mockRpc = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => mockBuilder),
    rpc: mockRpc,
  })),
}));

describe("Credits Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetClient();
    mockBuilder = createMockBuilder();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  describe("getCredits", () => {
    it("should return user credits", async () => {
      mockBuilder = createMockBuilder({
        balance: 50,
        lifetime_granted: 100,
        lifetime_used: 50,
      });

      const credits = await getCredits("user-123");

      expect(credits).toEqual({
        balance: 50,
        lifetimeGranted: 100,
        lifetimeUsed: 50,
      });
    });

    it("should throw error when fetch fails", async () => {
      mockBuilder = createMockBuilder(null, { message: "Database error" });

      await expect(getCredits("user-123")).rejects.toThrow("Failed to fetch credits");
    });

    it("should throw error when no credits record found", async () => {
      mockBuilder = createMockBuilder(null, null);

      await expect(getCredits("user-123")).rejects.toThrow("No credits record found");
    });

    it("should throw error when env vars missing", async () => {
      delete process.env.SUPABASE_URL;
      resetClient();

      await expect(getCredits("user-123")).rejects.toThrow(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"
      );
    });
  });

  describe("reserveCredits", () => {
    it("should return true when credits are sufficient", async () => {
      mockBuilder = createMockBuilder({ balance: 50 });

      const result = await reserveCredits("user-123", 10, "project-1");

      expect(result).toBe(true);
    });

    it("should return false when credits are insufficient", async () => {
      mockBuilder = createMockBuilder({ balance: 5 });

      const result = await reserveCredits("user-123", 10, "project-1");

      expect(result).toBe(false);
    });

    it("should throw error when fetch fails", async () => {
      mockBuilder = createMockBuilder(null, { message: "Fetch failed" });

      await expect(reserveCredits("user-123", 10, "project-1")).rejects.toThrow(
        "Failed to fetch user credits"
      );
    });
  });

  describe("refundCredits", () => {
    it("should call refund RPC function", async () => {
      mockRpc.mockResolvedValue({ error: null });

      await refundCredits("user-123", 5, "project-1", "Test refund");

      expect(mockRpc).toHaveBeenCalledWith("refund_credits", {
        p_user_id: "user-123",
        p_amount: 5,
        p_project_id: "project-1",
      });
    });

    it("should throw error when refund fails", async () => {
      mockRpc.mockResolvedValue({ error: { message: "Refund failed" } });

      await expect(
        refundCredits("user-123", 5, "project-1", "Test refund")
      ).rejects.toThrow("Failed to refund credits");
    });
  });
});
