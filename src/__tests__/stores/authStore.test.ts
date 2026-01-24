import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";

// Mock supabase
vi.mock("@/services/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
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
  display_name: "Test User",
  avatar_url: null,
};

const mockCredits = {
  balance: 50,
  lifetime_granted: 50,
  lifetime_used: 0,
};

describe("authStore", () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      session: null,
      profile: null,
      credits: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have null user and session initially", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.credits).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("initialize", () => {
    it("should set isInitialized after checking session", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("should set user and session when session exists", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Mock from().select().eq().single()
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockCredits, error: null });

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
    });

    it("should set up auth state change listener", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await useAuthStore.getState().initialize();

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: new Error("Session error"),
      });

      await useAuthStore.getState().initialize();

      // Should still set isInitialized even on error
      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("signIn", () => {
    it("should sign in user successfully", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockCredits, error: null });

      await useAuthStore.getState().signIn("test@example.com", "password123");

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during sign in", async () => {
      let resolveSignIn: (value: unknown) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      vi.mocked(supabase.auth.signInWithPassword).mockReturnValue(
        signInPromise as never
      );

      const signInCall = useAuthStore.getState().signIn("test@example.com", "password");

      // Check loading state is set
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Resolve the promise
      resolveSignIn!({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await signInCall.catch(() => {});
    });

    it("should set error on sign in failure", async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error("Invalid credentials"),
      });

      await expect(
        useAuthStore.getState().signIn("test@example.com", "wrong")
      ).rejects.toThrow("Invalid credentials");

      const state = useAuthStore.getState();
      expect(state.error).toBe("Invalid credentials");
      expect(state.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    it("should sign up user successfully", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockCredits, error: null });

      await useAuthStore.getState().signUp("new@example.com", "password123");

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.session).toEqual(mockSession);
    });

    it("should set error on sign up failure", async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { user: null, session: null },
        error: new Error("Email already registered"),
      });

      await expect(
        useAuthStore.getState().signUp("existing@example.com", "password")
      ).rejects.toThrow("Email already registered");

      expect(useAuthStore.getState().error).toBe("Email already registered");
    });
  });

  describe("signOut", () => {
    it("should sign out user and clear state", async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: mockUser as never,
        session: mockSession as never,
        profile: {
          id: mockProfile.id,
          email: mockProfile.email,
          displayName: mockProfile.display_name,
          avatarUrl: mockProfile.avatar_url,
        },
        credits: {
          balance: mockCredits.balance,
          lifetimeGranted: mockCredits.lifetime_granted,
          lifetimeUsed: mockCredits.lifetime_used,
        },
      });

      vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.credits).toBeNull();
    });

    it("should set error on sign out failure", async () => {
      vi.mocked(supabase.auth.signOut).mockResolvedValue({
        error: new Error("Sign out failed"),
      });

      await expect(useAuthStore.getState().signOut()).rejects.toThrow(
        "Sign out failed"
      );

      expect(useAuthStore.getState().error).toBe("Sign out failed");
    });
  });

  describe("refreshCredits", () => {
    it("should fetch and set profile and credits", async () => {
      useAuthStore.setState({ user: mockUser as never });

      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      vi.mocked(supabase.from).mockReturnValue(mockQueryBuilder as never);

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockCredits, error: null });

      await useAuthStore.getState().refreshCredits();

      const state = useAuthStore.getState();
      expect(state.profile).toEqual({
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        avatarUrl: null,
      });
      expect(state.credits).toEqual({
        balance: 50,
        lifetimeGranted: 50,
        lifetimeUsed: 0,
      });
    });

    it("should do nothing if no user", async () => {
      await useAuthStore.getState().refreshCredits();

      expect(supabase.from).not.toHaveBeenCalled();
    });
  });

  describe("clearError", () => {
    it("should clear error", () => {
      useAuthStore.setState({ error: "Some error" });

      useAuthStore.getState().clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
