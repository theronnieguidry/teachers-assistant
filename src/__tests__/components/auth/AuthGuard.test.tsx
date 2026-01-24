import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { AuthGuard } from "@/components/auth/AuthGuard";

// Track the mock state for useAuth
let mockAuthState = {
  isAuthenticated: false,
  isInitialized: true,
  isLoading: false,
};

// Mock useAuth hook
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockAuthState,
}));

// Mock AuthPage component
vi.mock("@/components/auth/AuthPage", () => ({
  AuthPage: () => <div data-testid="auth-page">Auth Page</div>,
}));

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state
    mockAuthState = {
      isAuthenticated: false,
      isInitialized: true,
      isLoading: false,
    };
  });

  it("should show loading spinner when not initialized", () => {
    mockAuthState = {
      isAuthenticated: false,
      isInitialized: false,
      isLoading: false,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should show loading spinner when loading", () => {
    mockAuthState = {
      isAuthenticated: false,
      isInitialized: true,
      isLoading: true,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should show auth page when not authenticated", () => {
    mockAuthState = {
      isAuthenticated: false,
      isInitialized: true,
      isLoading: false,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should render children when authenticated", () => {
    mockAuthState = {
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-page")).not.toBeInTheDocument();
  });

  it("should render multiple children when authenticated", () => {
    mockAuthState = {
      isAuthenticated: true,
      isInitialized: true,
      isLoading: false,
    };

    render(
      <AuthGuard>
        <div>First Child</div>
        <div>Second Child</div>
      </AuthGuard>
    );

    expect(screen.getByText("First Child")).toBeInTheDocument();
    expect(screen.getByText("Second Child")).toBeInTheDocument();
  });

  it("should prioritize loading over auth check", () => {
    // Even if authenticated, should show loading if still initializing
    mockAuthState = {
      isAuthenticated: true,
      isInitialized: false,
      isLoading: true,
    };

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
