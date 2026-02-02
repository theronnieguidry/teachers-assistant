import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import {
  authMiddleware,
  resetClient as resetAuthClient,
} from "../../middleware/auth.js";
import checkoutRouter, { handleWebhook } from "../../routes/checkout.js";
import { resetClient as resetCreditsClient } from "../../services/credits.js";

// Mock Stripe
const mockCheckoutSessionCreate = vi.fn();
const mockWebhooksConstructEvent = vi.fn();

vi.mock("stripe", () => {
  return {
    default: vi.fn(() => ({
      checkout: {
        sessions: {
          create: mockCheckoutSessionCreate,
        },
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
    })),
  };
});

// Mock Supabase
const mockGetUser = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockSingle = vi.fn();
const mockInsert = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockReturnThis();
const mockUpdate = vi.fn().mockReturnThis();
const mockRpc = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      select: mockSelect,
      eq: mockEq,
      single: mockSingle,
      insert: mockInsert,
      order: mockOrder,
      update: mockUpdate,
    })),
    rpc: mockRpc,
  })),
}));

describe("Checkout Routes", () => {
  const app = express();
  app.use(express.json());
  app.use("/checkout", authMiddleware, checkoutRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthClient();
    resetCreditsClient();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.APP_URL = "http://localhost:1420";
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.APP_URL;
  });

  describe("GET /checkout/packs", () => {
    it("should return 401 without auth", async () => {
      const response = await request(app).get("/checkout/packs");
      expect(response.status).toBe(401);
    });

    it("should return available credit packs when authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      mockOrder.mockResolvedValue({
        data: [
          {
            id: "pack-1",
            name: "Starter Pack",
            credits: 100,
            price_cents: 500,
            stripe_price_id: "price_123",
          },
          {
            id: "pack-2",
            name: "Value Pack",
            credits: 500,
            price_cents: 2000,
            stripe_price_id: "price_456",
          },
        ],
        error: null,
      });

      const response = await request(app)
        .get("/checkout/packs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.packs).toHaveLength(2);
      expect(response.body.packs[0]).toEqual({
        id: "pack-1",
        name: "Starter Pack",
        credits: 100,
        priceCents: 500,
        priceDisplay: "$5.00",
        stripePriceId: "price_123",
      });
    });

    it("should return empty array when no packs available", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      mockOrder.mockResolvedValue({
        data: [],
        error: null,
      });

      const response = await request(app)
        .get("/checkout/packs")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.packs).toEqual([]);
    });
  });

  describe("POST /checkout/create-session", () => {
    it("should return 401 without auth", async () => {
      const response = await request(app)
        .post("/checkout/create-session")
        .send({ packId: "pack-1" });
      expect(response.status).toBe(401);
    });

    it("should return 400 without packId", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      const response = await request(app)
        .post("/checkout/create-session")
        .set("Authorization", "Bearer valid-token")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("packId is required");
    });

    it("should return 404 for non-existent pack", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const response = await request(app)
        .post("/checkout/create-session")
        .set("Authorization", "Bearer valid-token")
        .send({ packId: "invalid-pack" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Credit pack not found");
    });

    it("should return 503 when Stripe prices not configured", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: {
          id: "pack-1",
          name: "Starter Pack",
          credits: 100,
          price_cents: 500,
          stripe_price_id: "price_starter_placeholder",
        },
        error: null,
      });

      const response = await request(app)
        .post("/checkout/create-session")
        .set("Authorization", "Bearer valid-token")
        .send({ packId: "pack-1" });

      expect(response.status).toBe(503);
      expect(response.body.error).toBe("Payment system not configured");
    });

    it("should create checkout session successfully", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: {
          id: "pack-1",
          name: "Starter Pack",
          credits: 100,
          price_cents: 500,
          stripe_price_id: "price_real_123",
        },
        error: null,
      });

      mockCheckoutSessionCreate.mockResolvedValue({
        id: "cs_test_session",
        url: "https://checkout.stripe.com/session/cs_test_session",
      });

      mockInsert.mockReturnValue({
        error: null,
      });

      const response = await request(app)
        .post("/checkout/create-session")
        .set("Authorization", "Bearer valid-token")
        .send({ packId: "pack-1" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBe("cs_test_session");
      expect(response.body.url).toBe(
        "https://checkout.stripe.com/session/cs_test_session"
      );

      expect(mockCheckoutSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "payment",
          payment_method_types: ["card"],
          client_reference_id: "user-123",
          metadata: expect.objectContaining({
            packId: "pack-1",
            userId: "user-123",
            credits: "100",
          }),
        })
      );
    });
  });

  describe("GET /checkout/purchases", () => {
    it("should return 401 without auth", async () => {
      const response = await request(app).get("/checkout/purchases");
      expect(response.status).toBe(401);
    });

    it("should return purchase history", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      mockOrder.mockResolvedValue({
        data: [
          {
            id: "purchase-1",
            amount_cents: 500,
            credits_granted: 100,
            status: "completed",
            created_at: "2024-01-15T10:00:00Z",
            completed_at: "2024-01-15T10:01:00Z",
            credit_packs: { name: "Starter Pack" },
          },
        ],
        error: null,
      });

      const response = await request(app)
        .get("/checkout/purchases")
        .set("Authorization", "Bearer valid-token");

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.purchases).toHaveLength(1);
    });
  });
});

describe("Webhook Handler", () => {
  const app = express();

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthClient();
    resetCreditsClient();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("should return 400 without stripe-signature header", async () => {
    const webhookApp = express();
    webhookApp.post(
      "/webhook",
      express.raw({ type: "application/json" }),
      handleWebhook
    );

    const response = await request(webhookApp)
      .post("/webhook")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "test" }));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Missing stripe-signature header");
  });

  it("should return 400 for invalid signature", async () => {
    const webhookApp = express();
    webhookApp.post(
      "/webhook",
      express.raw({ type: "application/json" }),
      handleWebhook
    );

    mockWebhooksConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await request(webhookApp)
      .post("/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "invalid-sig")
      .send(JSON.stringify({ type: "test" }));

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Webhook signature verification failed");
  });

  it("should handle checkout.session.completed event", async () => {
    const webhookApp = express();
    webhookApp.post(
      "/webhook",
      express.raw({ type: "application/json" }),
      handleWebhook
    );

    mockWebhooksConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          client_reference_id: "user-123",
          metadata: {
            packId: "pack-1",
            userId: "user-123",
            credits: "100",
          },
          amount_total: 500,
          payment_intent: "pi_123",
        },
      },
    });

    // Mock existing purchase lookup
    mockSingle.mockResolvedValue({
      data: { id: "purchase-1", status: "pending" },
      error: null,
    });

    // Mock grant credits RPC
    mockRpc.mockResolvedValue({ error: null });

    const response = await request(webhookApp)
      .post("/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "valid-sig")
      .send(JSON.stringify({ type: "checkout.session.completed" }));

    expect(response.status).toBe(200);
    expect(response.body.received).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("grant_purchased_credits", {
      p_user_id: "user-123",
      p_amount: 100,
      p_purchase_id: "purchase-1",
    });
  });

  it("should skip already completed purchases (idempotency)", async () => {
    const webhookApp = express();
    webhookApp.post(
      "/webhook",
      express.raw({ type: "application/json" }),
      handleWebhook
    );

    mockWebhooksConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          client_reference_id: "user-123",
          metadata: { credits: "100" },
        },
      },
    });

    // Mock already completed purchase
    mockSingle.mockResolvedValue({
      data: { id: "purchase-1", status: "completed" },
      error: null,
    });

    const response = await request(webhookApp)
      .post("/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "valid-sig")
      .send(JSON.stringify({ type: "checkout.session.completed" }));

    expect(response.status).toBe(200);
    // Should not call grant_purchased_credits again
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
