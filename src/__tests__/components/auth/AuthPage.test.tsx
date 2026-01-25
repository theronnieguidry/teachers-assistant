import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../utils";
import { AuthPage } from "@/components/auth/AuthPage";

// Mock child components
vi.mock("@/components/auth/LoginForm", () => ({
  LoginForm: ({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) => (
    <div data-testid="login-form">
      <span>Login Form</span>
      <button onClick={onSwitchToSignUp}>Switch to Sign Up</button>
    </div>
  ),
}));

vi.mock("@/components/auth/SignupForm", () => ({
  SignupForm: ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => (
    <div data-testid="signup-form">
      <span>Signup Form</span>
      <button onClick={onSwitchToLogin}>Switch to Login</button>
    </div>
  ),
}));

describe("AuthPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("AUTH-PAGE-001: should render the logo and title", () => {
      render(<AuthPage />);

      expect(screen.getByText("Teacher's Assistant")).toBeInTheDocument();
      expect(screen.getByText("AI-powered teaching materials")).toBeInTheDocument();
    });

    it("AUTH-PAGE-002: should render the footer text", () => {
      render(<AuthPage />);

      expect(
        screen.getByText(/Generate worksheets, lesson plans, and answer keys/i)
      ).toBeInTheDocument();
    });

    it("AUTH-PAGE-003: should render LoginForm by default", () => {
      render(<AuthPage />);

      expect(screen.getByTestId("login-form")).toBeInTheDocument();
      expect(screen.queryByTestId("signup-form")).not.toBeInTheDocument();
    });
  });

  describe("form switching", () => {
    it("AUTH-PAGE-004: should switch to SignupForm when onSwitchToSignUp is called", async () => {
      const { user } = render(<AuthPage />);

      // Initially shows login form
      expect(screen.getByTestId("login-form")).toBeInTheDocument();

      // Click switch to sign up
      await user.click(screen.getByRole("button", { name: "Switch to Sign Up" }));

      // Now shows signup form
      await waitFor(() => {
        expect(screen.getByTestId("signup-form")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("login-form")).not.toBeInTheDocument();
    });

    it("AUTH-PAGE-005: should switch back to LoginForm when onSwitchToLogin is called", async () => {
      const { user } = render(<AuthPage />);

      // Switch to signup
      await user.click(screen.getByRole("button", { name: "Switch to Sign Up" }));

      await waitFor(() => {
        expect(screen.getByTestId("signup-form")).toBeInTheDocument();
      });

      // Switch back to login
      await user.click(screen.getByRole("button", { name: "Switch to Login" }));

      await waitFor(() => {
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("signup-form")).not.toBeInTheDocument();
    });

    it("AUTH-PAGE-006: should toggle between forms multiple times", async () => {
      const { user } = render(<AuthPage />);

      // Login -> Signup
      await user.click(screen.getByRole("button", { name: "Switch to Sign Up" }));
      await waitFor(() => {
        expect(screen.getByTestId("signup-form")).toBeInTheDocument();
      });

      // Signup -> Login
      await user.click(screen.getByRole("button", { name: "Switch to Login" }));
      await waitFor(() => {
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
      });

      // Login -> Signup again
      await user.click(screen.getByRole("button", { name: "Switch to Sign Up" }));
      await waitFor(() => {
        expect(screen.getByTestId("signup-form")).toBeInTheDocument();
      });
    });
  });

  describe("layout", () => {
    it("AUTH-PAGE-007: should have centered layout", () => {
      render(<AuthPage />);

      // The container should have flex-col and items-center classes
      const container = screen.getByText("Teacher's Assistant").closest("div")
        ?.parentElement?.parentElement;

      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("flex-col");
      expect(container).toHaveClass("items-center");
    });

    it("AUTH-PAGE-008: should have minimum height of screen", () => {
      render(<AuthPage />);

      const container = screen.getByText("Teacher's Assistant").closest("div")
        ?.parentElement?.parentElement;

      expect(container).toHaveClass("min-h-screen");
    });
  });

  describe("branding", () => {
    it("AUTH-PAGE-009: should render graduation cap icon", () => {
      const { container } = render(<AuthPage />);

      // The icon is wrapped in a div with primary background
      const logoContainer = container.querySelector(".bg-primary");

      expect(logoContainer).toBeInTheDocument();
    });

    it("AUTH-PAGE-010: should have gradient background", () => {
      const { container } = render(<AuthPage />);

      const gradientContainer = container.querySelector(".bg-gradient-to-b");

      expect(gradientContainer).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("AUTH-PAGE-011: should have accessible heading", () => {
      render(<AuthPage />);

      const heading = screen.getByRole("heading", { name: "Teacher's Assistant" });
      expect(heading).toBeInTheDocument();
    });

    it("AUTH-PAGE-012: should have descriptive subtitle", () => {
      render(<AuthPage />);

      expect(screen.getByText("AI-powered teaching materials")).toBeInTheDocument();
    });
  });
});
