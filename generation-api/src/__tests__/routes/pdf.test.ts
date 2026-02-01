import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { authMiddleware, resetClient as resetAuthClient } from "../../middleware/auth.js";
import pdfRouter from "../../routes/pdf.js";

// Mock auth
const mockGetUser = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock Playwright
const mockPdf = vi.fn();
const mockSetContent = vi.fn();
const mockNewPage = vi.fn();
const mockClose = vi.fn();

vi.mock("playwright", () => ({
  chromium: {
    launch: vi.fn(() => ({
      newPage: mockNewPage,
      close: mockClose,
    })),
  },
}));

describe("PDF Route", () => {
  const app = express();
  app.use(express.json());
  app.use("/pdf", authMiddleware, pdfRouter);

  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthClient();
    process.env.SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_ANON_KEY = "test-anon-key";

    // Setup Playwright mocks
    mockPdf.mockResolvedValue(Buffer.from("%PDF-1.4 fake pdf content"));
    mockSetContent.mockResolvedValue(undefined);
    mockNewPage.mockResolvedValue({
      setContent: mockSetContent,
      pdf: mockPdf,
    });
    mockClose.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it("should return 401 without auth", async () => {
    const response = await request(app)
      .post("/pdf")
      .send({ html: "<p>Test</p>" });

    expect(response.status).toBe(401);
  });

  it("should return 400 for missing html", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const response = await request(app)
      .post("/pdf")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });

  it("should return 400 for empty html", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const response = await request(app)
      .post("/pdf")
      .set("Authorization", "Bearer valid-token")
      .send({ html: "" });

    expect(response.status).toBe(400);
  });

  it("should generate PDF successfully", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const response = await request(app)
      .post("/pdf")
      .set("Authorization", "Bearer valid-token")
      .send({ html: "<p>Test content</p>" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toContain("attachment");
    expect(mockSetContent).toHaveBeenCalled();
    expect(mockPdf).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it("should accept optional PDF options", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const response = await request(app)
      .post("/pdf")
      .set("Authorization", "Bearer valid-token")
      .send({
        html: "<p>Test content</p>",
        options: {
          format: "a4",
          landscape: true,
          margin: {
            top: "1in",
            bottom: "1in",
          },
        },
      });

    expect(response.status).toBe(200);
    expect(mockPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "a4",
        landscape: true,
        margin: expect.objectContaining({
          top: "1in",
          bottom: "1in",
        }),
      })
    );
  });

  it("should handle PDF generation errors", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    mockPdf.mockRejectedValueOnce(new Error("Browser crashed"));

    const response = await request(app)
      .post("/pdf")
      .set("Authorization", "Bearer valid-token")
      .send({ html: "<p>Test content</p>" });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("PDF generation failed");
  });
});
