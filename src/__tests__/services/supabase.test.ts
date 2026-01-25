import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Store original env
const originalEnv = { ...import.meta.env };

// Mock @supabase/supabase-js before importing the module
const mockCreateClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string) => mockCreateClient(url, key),
}));

describe("supabase client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules to re-run initialization
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original env
    vi.stubEnv("VITE_SUPABASE_URL", originalEnv.VITE_SUPABASE_URL);
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", originalEnv.VITE_SUPABASE_ANON_KEY);
  });

  describe("initialization", () => {
    it("SUPABASE-001: should create client with environment variables", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

      mockCreateClient.mockReturnValue({ auth: {}, from: vi.fn() });

      // Dynamically import to trigger re-initialization
      const { supabase } = await import("@/services/supabase");

      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key"
      );
      expect(supabase).toBeDefined();
    });

    it("SUPABASE-002: should use fallback URL when VITE_SUPABASE_URL is not set", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

      mockCreateClient.mockReturnValue({ auth: {}, from: vi.fn() });

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await import("@/services/supabase");

      expect(mockCreateClient).toHaveBeenCalledWith(
        "http://localhost:54321",
        "placeholder-key"
      );
      expect(warnSpy).toHaveBeenCalledWith(
        "Supabase environment variables not set. Authentication will not work."
      );

      warnSpy.mockRestore();
    });

    it("SUPABASE-003: should use fallback key when VITE_SUPABASE_ANON_KEY is not set", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

      mockCreateClient.mockReturnValue({ auth: {}, from: vi.fn() });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await import("@/services/supabase");

      expect(mockCreateClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "placeholder-key"
      );
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it("SUPABASE-004: should log warning when environment variables are missing", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

      mockCreateClient.mockReturnValue({ auth: {}, from: vi.fn() });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await import("@/services/supabase");

      expect(warnSpy).toHaveBeenCalledWith(
        "Supabase environment variables not set. Authentication will not work."
      );

      warnSpy.mockRestore();
    });

    it("SUPABASE-005: should not log warning when environment variables are set", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

      mockCreateClient.mockReturnValue({ auth: {}, from: vi.fn() });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await import("@/services/supabase");

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe("exports", () => {
    it("SUPABASE-006: should export supabase client", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

      const mockClient = { auth: {}, from: vi.fn() };
      mockCreateClient.mockReturnValue(mockClient);

      const { supabase } = await import("@/services/supabase");

      expect(supabase).toBe(mockClient);
    });

    it("SUPABASE-007: should export Database type", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");

      mockCreateClient.mockReturnValue({ auth: {}, from: vi.fn() });

      const module = await import("@/services/supabase");

      // Database is a type export, we can verify the module structure
      expect(module).toHaveProperty("supabase");
    });
  });

  describe("client configuration", () => {
    it("SUPABASE-008: should create client with correct URL format", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "https://project-id.supabase.co");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key-123");

      mockCreateClient.mockReturnValue({ auth: {}, from: vi.fn() });

      await import("@/services/supabase");

      const [url] = mockCreateClient.mock.calls[0];
      expect(url).toMatch(/^https:\/\/.*\.supabase\.co$/);
    });

    it("SUPABASE-009: should handle local development URL", async () => {
      vi.stubEnv("VITE_SUPABASE_URL", "http://localhost:54321");
      vi.stubEnv("VITE_SUPABASE_ANON_KEY", "local-anon-key");

      mockCreateClient.mockReturnValue({ auth: {}, from: vi.fn() });

      await import("@/services/supabase");

      expect(mockCreateClient).toHaveBeenCalledWith(
        "http://localhost:54321",
        "local-anon-key"
      );
    });
  });
});
