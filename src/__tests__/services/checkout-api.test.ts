import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getCreditPacks,
  createCheckoutSession,
  getPurchaseHistory,
  type CreditPack,
  type Purchase,
} from "@/services/checkout-api";
import { GenerationApiError } from "@/services/generation-api";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Checkout API Service", () => {
  const mockAccessToken = "test-access-token";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getCreditPacks", () => {
    const mockPacks: CreditPack[] = [
      {
        id: "pack-10",
        name: "10 Credits",
        credits: 10,
        priceCents: 499,
        priceDisplay: "$4.99",
      },
      {
        id: "pack-50",
        name: "50 Credits",
        credits: 50,
        priceCents: 1999,
        priceDisplay: "$19.99",
      },
    ];

    it("should call /checkout/packs with auth header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ packs: mockPacks }),
      });

      await getCreditPacks(mockAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/checkout/packs"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it("should return packs array on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ packs: mockPacks }),
      });

      const result = await getCreditPacks(mockAccessToken);

      expect(result).toEqual(mockPacks);
      expect(result).toHaveLength(2);
    });

    it("should throw GenerationApiError on non-ok response", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      await expect(getCreditPacks(mockAccessToken)).rejects.toThrow(
        GenerationApiError
      );
      await expect(getCreditPacks(mockAccessToken)).rejects.toMatchObject({
        statusCode: 401,
        message: "Unauthorized",
      });
    });

    it("should handle JSON parse errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(getCreditPacks(mockAccessToken)).rejects.toThrow(
        GenerationApiError
      );
      await expect(getCreditPacks(mockAccessToken)).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch credit packs",
      });
    });

    it("maps known configuration error codes to actionable messages", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            code: "stripe_not_configured",
            message: "internal message",
          }),
      });

      await expect(getCreditPacks(mockAccessToken)).rejects.toMatchObject({
        statusCode: 503,
        message:
          "Payments are currently unavailable because Stripe is not configured.",
      });
    });

    it("should use correct API base URL from environment", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ packs: [] }),
      });

      await getCreditPacks(mockAccessToken);

      // Should call fetch with the API URL from environment or default
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/checkout\/packs$/),
        expect.any(Object)
      );
    });
  });

  describe("createCheckoutSession", () => {
    const mockSession = {
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    };

    it("should call /checkout/create-session with packId", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      await createCheckoutSession("pack-50", mockAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/checkout/create-session"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ packId: "pack-50" }),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it("should return sessionId and url on success", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      const result = await createCheckoutSession("pack-10", mockAccessToken);

      expect(result).toEqual({
        sessionId: "cs_test_123",
        url: "https://checkout.stripe.com/pay/cs_test_123",
      });
    });

    it("should throw 503 error with custom message for payment not configured", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () =>
          Promise.resolve({
            message: "Payment system unavailable",
          }),
      });

      await expect(
        createCheckoutSession("pack-10", mockAccessToken)
      ).rejects.toThrow(GenerationApiError);
      await expect(
        createCheckoutSession("pack-10", mockAccessToken)
      ).rejects.toMatchObject({
        statusCode: 503,
        message: "Payment system unavailable",
      });
    });

    it("should use default message for 503 without message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      });

      await expect(
        createCheckoutSession("pack-10", mockAccessToken)
      ).rejects.toMatchObject({
        statusCode: 503,
        message: "Payment system is not configured. Please contact support.",
      });
    });

    it("should throw GenerationApiError on other errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Invalid pack ID" }),
      });

      await expect(
        createCheckoutSession("invalid-pack", mockAccessToken)
      ).rejects.toThrow(GenerationApiError);
      await expect(
        createCheckoutSession("invalid-pack", mockAccessToken)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Invalid pack ID",
      });
    });

    it("should send correct request body format", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      });

      await createCheckoutSession("pack-100", mockAccessToken);

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body).toEqual({ packId: "pack-100" });
    });
  });

  describe("getPurchaseHistory", () => {
    const mockApiPurchases = [
      {
        id: "purchase-1",
        amount_cents: 499,
        credits_granted: 10,
        status: "completed",
        created_at: "2024-01-15T10:00:00Z",
        completed_at: "2024-01-15T10:01:00Z",
        credit_packs: { name: "10 Credits" },
      },
      {
        id: "purchase-2",
        amount_cents: 1999,
        credits_granted: 50,
        status: "pending",
        created_at: "2024-01-20T12:00:00Z",
        completed_at: null,
      },
    ];

    const expectedPurchases: Purchase[] = [
      {
        id: "purchase-1",
        amountCents: 499,
        creditsGranted: 10,
        status: "completed",
        createdAt: "2024-01-15T10:00:00Z",
        completedAt: "2024-01-15T10:01:00Z",
        packName: "10 Credits",
      },
      {
        id: "purchase-2",
        amountCents: 1999,
        creditsGranted: 50,
        status: "pending",
        createdAt: "2024-01-20T12:00:00Z",
        completedAt: null,
        packName: undefined,
      },
    ];

    it("should call /checkout/purchases with auth header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ purchases: mockApiPurchases }),
      });

      await getPurchaseHistory(mockAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/checkout/purchases"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });

    it("should return mapped Purchase objects (camelCase)", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ purchases: mockApiPurchases }),
      });

      const result = await getPurchaseHistory(mockAccessToken);

      expect(result).toEqual(expectedPurchases);
      expect(result[0]).toHaveProperty("amountCents");
      expect(result[0]).toHaveProperty("creditsGranted");
      expect(result[0]).toHaveProperty("createdAt");
      expect(result[0]).toHaveProperty("completedAt");
      expect(result[0]).toHaveProperty("packName");
    });

    it("should return empty array if no purchases", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ purchases: [] }),
      });

      const result = await getPurchaseHistory(mockAccessToken);

      expect(result).toEqual([]);
    });

    it("should return empty array if purchases is undefined", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await getPurchaseHistory(mockAccessToken);

      expect(result).toEqual([]);
    });

    it("should handle error responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Not authenticated" }),
      });

      await expect(getPurchaseHistory(mockAccessToken)).rejects.toThrow(
        GenerationApiError
      );
      await expect(getPurchaseHistory(mockAccessToken)).rejects.toMatchObject({
        statusCode: 401,
        message: "Not authenticated",
      });
    });

    it("should handle JSON parse errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Parse error")),
      });

      await expect(getPurchaseHistory(mockAccessToken)).rejects.toThrow(
        GenerationApiError
      );
      await expect(getPurchaseHistory(mockAccessToken)).rejects.toMatchObject({
        statusCode: 500,
        message: "Failed to fetch purchase history",
      });
    });
  });
});
