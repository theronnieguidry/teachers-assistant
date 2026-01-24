import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../utils";
import { SignupForm } from "@/components/auth/SignupForm";

// Mock useAuth hook
const mockSignUp = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

describe("SignupForm", () => {
  const mockOnSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render signup form with all fields", () => {
      render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      expect(screen.getByText("Create an account")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("should display trial credits banner", () => {
      render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      expect(screen.getByText("50 free credits")).toBeInTheDocument();
      expect(screen.getByText(/to get you started/i)).toBeInTheDocument();
    });

    it("should display login link", () => {
      render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      expect(screen.getByText("Already have an account?")).toBeInTheDocument();
      expect(screen.getByText("Sign in")).toBeInTheDocument();
    });

    it("should have placeholder text for email", () => {
      render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      expect(screen.getByPlaceholderText("teacher@school.edu")).toBeInTheDocument();
    });

    it("should display description about AI teaching materials", () => {
      render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      expect(screen.getByText("Start creating teaching materials with AI")).toBeInTheDocument();
    });
  });

  describe("user interactions", () => {
    it("should call onSwitchToLogin when sign in link clicked", async () => {
      const { user } = render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      await user.click(screen.getByText("Sign in"));

      expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1);
    });

    it("should allow typing in email field", async () => {
      const { user } = render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      const emailInput = screen.getByLabelText("Email");
      await user.type(emailInput, "new@example.com");

      expect(emailInput).toHaveValue("new@example.com");
    });

    it("should allow typing in password fields", async () => {
      const { user } = render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      const passwordInput = screen.getByLabelText("Password");
      const confirmInput = screen.getByLabelText("Confirm Password");

      await user.type(passwordInput, "password123");
      await user.type(confirmInput, "password123");

      expect(passwordInput).toHaveValue("password123");
      expect(confirmInput).toHaveValue("password123");
    });
  });

  describe("form submission", () => {
    it("should call signUp with valid credentials", async () => {
      mockSignUp.mockResolvedValue(undefined);

      const { user } = render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      await user.type(screen.getByLabelText("Email"), "new@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(screen.getByLabelText("Confirm Password"), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(
        () => {
          expect(mockSignUp).toHaveBeenCalledWith("new@example.com", "password123");
        },
        { timeout: 5000 }
      );
      expect(mockClearError).toHaveBeenCalled();
    });

    it("should display error when sign up fails", async () => {
      mockSignUp.mockRejectedValue(new Error("Email already registered"));

      const { user } = render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      await user.type(screen.getByLabelText("Email"), "existing@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(screen.getByLabelText("Confirm Password"), "password123");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(
        () => {
          expect(screen.getByText("Email already registered")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it("should not call signUp when form fields are empty", async () => {
      const { user } = render(<SignupForm onSwitchToLogin={mockOnSwitchToLogin} />);

      await user.click(screen.getByRole("button", { name: /create account/i }));

      // Wait a bit to ensure the handler had time to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });
});
