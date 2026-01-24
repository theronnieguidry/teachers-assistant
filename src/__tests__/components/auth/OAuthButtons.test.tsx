import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import "@/__tests__/mocks/supabase";

// Mock the useAuth hook
const mockSignInWithOAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signInWithOAuth: mockSignInWithOAuth,
    isLoading: false,
  }),
}));

describe("OAuthButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue(undefined);
  });

  describe("rendering", () => {
    it("should render Google sign in button", () => {
      render(<OAuthButtons />);

      expect(
        screen.getByRole("button", { name: /continue with google/i })
      ).toBeInTheDocument();
    });

    it("should render Apple sign in button", () => {
      render(<OAuthButtons />);

      expect(
        screen.getByRole("button", { name: /continue with apple/i })
      ).toBeInTheDocument();
    });

    it("should disable buttons when disabled prop is true", () => {
      render(<OAuthButtons disabled={true} />);

      expect(
        screen.getByRole("button", { name: /continue with google/i })
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /continue with apple/i })
      ).toBeDisabled();
    });
  });

  describe("interactions", () => {
    it("should call signInWithOAuth with 'google' when Google button clicked", async () => {
      render(<OAuthButtons />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      fireEvent.click(googleButton);

      expect(mockSignInWithOAuth).toHaveBeenCalledWith("google");
    });

    it("should call signInWithOAuth with 'apple' when Apple button clicked", async () => {
      render(<OAuthButtons />);

      const appleButton = screen.getByRole("button", {
        name: /continue with apple/i,
      });
      fireEvent.click(appleButton);

      expect(mockSignInWithOAuth).toHaveBeenCalledWith("apple");
    });

    it("should call onOAuthStart when OAuth begins", async () => {
      const onOAuthStart = vi.fn();
      render(<OAuthButtons onOAuthStart={onOAuthStart} />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      fireEvent.click(googleButton);

      expect(onOAuthStart).toHaveBeenCalled();
    });

    it("should call onOAuthError when OAuth fails", async () => {
      const onOAuthError = vi.fn();
      mockSignInWithOAuth.mockRejectedValue(new Error("OAuth error"));

      render(<OAuthButtons onOAuthError={onOAuthError} />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      fireEvent.click(googleButton);

      // Wait for the async error handling
      await vi.waitFor(() => {
        expect(onOAuthError).toHaveBeenCalledWith("OAuth error");
      });
    });

    it("should show 'Sign in was cancelled' for access_denied error", async () => {
      const onOAuthError = vi.fn();
      mockSignInWithOAuth.mockRejectedValue(
        new Error("access_denied: user cancelled")
      );

      render(<OAuthButtons onOAuthError={onOAuthError} />);

      const googleButton = screen.getByRole("button", {
        name: /continue with google/i,
      });
      fireEvent.click(googleButton);

      await vi.waitFor(() => {
        expect(onOAuthError).toHaveBeenCalledWith("Sign in was cancelled.");
      });
    });
  });
});
