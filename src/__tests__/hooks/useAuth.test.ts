import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/authStore";

// Mock the auth store
vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

const mockUser = {
  id: "user-123",
  email: "test@example.com",
  created_at: "2024-01-01",
  aud: "authenticated",
  role: "authenticated",
};

const mockSession = {
  access_token: "mock-token",
  refresh_token: "mock-refresh",
  user: mockUser,
};

const mockProfile = {
  id: "user-123",
  email: "test@example.com",
  displayName: "Test User",
  avatarUrl: null,
};

const mockCredits = {
  balance: 50,
  lifetimeGranted: 50,
  lifetimeUsed: 0,
};

describe("useAuth hook", () => {
  const mockInitialize = vi.fn();
  const mockSignIn = vi.fn();
  const mockSignUp = vi.fn();
  const mockSignInWithOAuth = vi.fn();
  const mockSignOut = vi.fn();
  const mockRefreshCredits = vi.fn();
  const mockClearError = vi.fn();

  const createMockStore = (overrides = {}) => ({
    user: null,
    session: null,
    profile: null,
    credits: null,
    isLoading: false,
    isInitialized: false,
    error: null,
    initialize: mockInitialize,
    signIn: mockSignIn,
    signUp: mockSignUp,
    signInWithOAuth: mockSignInWithOAuth,
    signOut: mockSignOut,
    refreshCredits: mockRefreshCredits,
    clearError: mockClearError,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("AUTH-HOOK-001: should call initialize when not initialized", () => {
      const mockStore = createMockStore({ isInitialized: false });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      renderHook(() => useAuth());

      expect(mockInitialize).toHaveBeenCalled();
    });

    it("AUTH-HOOK-002: should not call initialize when already initialized", () => {
      const mockStore = createMockStore({ isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      renderHook(() => useAuth());

      expect(mockInitialize).not.toHaveBeenCalled();
    });
  });

  describe("return values", () => {
    it("AUTH-HOOK-003: should return user from store", () => {
      const mockStore = createMockStore({ user: mockUser, isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
    });

    it("AUTH-HOOK-004: should return session from store", () => {
      const mockStore = createMockStore({ session: mockSession, isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.session).toEqual(mockSession);
    });

    it("AUTH-HOOK-005: should return profile from store", () => {
      const mockStore = createMockStore({ profile: mockProfile, isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.profile).toEqual(mockProfile);
    });

    it("AUTH-HOOK-006: should return credits from store", () => {
      const mockStore = createMockStore({ credits: mockCredits, isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.credits).toEqual(mockCredits);
    });

    it("AUTH-HOOK-007: should return isLoading from store", () => {
      const mockStore = createMockStore({ isLoading: true, isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });

    it("AUTH-HOOK-008: should return isInitialized from store", () => {
      const mockStore = createMockStore({ isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isInitialized).toBe(true);
    });

    it("AUTH-HOOK-009: should return error from store", () => {
      const mockStore = createMockStore({ error: "Test error", isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toBe("Test error");
    });
  });

  describe("isAuthenticated", () => {
    it("AUTH-HOOK-010: should return true when user exists", () => {
      const mockStore = createMockStore({ user: mockUser, isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);
    });

    it("AUTH-HOOK-011: should return false when user is null", () => {
      const mockStore = createMockStore({ user: null, isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe("action methods", () => {
    it("AUTH-HOOK-012: should return signIn method from store", () => {
      const mockStore = createMockStore({ isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.signIn).toBe(mockSignIn);
    });

    it("AUTH-HOOK-013: should return signUp method from store", () => {
      const mockStore = createMockStore({ isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.signUp).toBe(mockSignUp);
    });

    it("AUTH-HOOK-014: should return signInWithOAuth method from store", () => {
      const mockStore = createMockStore({ isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.signInWithOAuth).toBe(mockSignInWithOAuth);
    });

    it("AUTH-HOOK-015: should return signOut method from store", () => {
      const mockStore = createMockStore({ isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.signOut).toBe(mockSignOut);
    });

    it("AUTH-HOOK-016: should return refreshCredits method from store", () => {
      const mockStore = createMockStore({ isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.refreshCredits).toBe(mockRefreshCredits);
    });

    it("AUTH-HOOK-017: should return clearError method from store", () => {
      const mockStore = createMockStore({ isInitialized: true });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result } = renderHook(() => useAuth());

      expect(result.current.clearError).toBe(mockClearError);
    });
  });

  describe("reactivity", () => {
    it("AUTH-HOOK-018: should re-render when store values change", () => {
      const mockStore = createMockStore({ isInitialized: true, isLoading: false });
      vi.mocked(useAuthStore).mockReturnValue(mockStore);

      const { result, rerender } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      // Update store
      const updatedStore = createMockStore({ isInitialized: true, isLoading: true });
      vi.mocked(useAuthStore).mockReturnValue(updatedStore);

      rerender();

      expect(result.current.isLoading).toBe(true);
    });
  });
});
