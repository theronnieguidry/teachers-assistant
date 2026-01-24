import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../utils";
import { LoginForm } from "@/components/auth/LoginForm";

// Mock useAuth hook
const mockSignIn = vi.fn();
const mockClearError = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

describe("LoginForm", () => {
  const mockOnSwitchToSignUp = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render login form with all fields", () => {
      render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      expect(screen.getByText("Welcome back")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("should display sign up link", () => {
      render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      expect(screen.getByText("Sign up")).toBeInTheDocument();
    });

    it("should have placeholder text for email", () => {
      render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      expect(screen.getByPlaceholderText("teacher@school.edu")).toBeInTheDocument();
    });

    it("should display description text", () => {
      render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      expect(screen.getByText("Sign in to your Teacher's Assistant account")).toBeInTheDocument();
    });
  });

  describe("user interactions", () => {
    it("should call onSwitchToSignUp when sign up link clicked", async () => {
      const { user } = render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      await user.click(screen.getByText("Sign up"));

      expect(mockOnSwitchToSignUp).toHaveBeenCalledTimes(1);
    });

    it("should allow typing in email field", async () => {
      const { user } = render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      const emailInput = screen.getByLabelText("Email");
      await user.type(emailInput, "test@example.com");

      expect(emailInput).toHaveValue("test@example.com");
    });

    it("should allow typing in password field", async () => {
      const { user } = render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      const passwordInput = screen.getByLabelText("Password");
      await user.type(passwordInput, "password123");

      expect(passwordInput).toHaveValue("password123");
    });
  });

  describe("form submission", () => {
    it("should call signIn with valid credentials", async () => {
      mockSignIn.mockResolvedValue(undefined);

      const { user } = render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(
        () => {
          expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password123");
        },
        { timeout: 5000 }
      );
      expect(mockClearError).toHaveBeenCalled();
    });

    it("should display error when sign in fails", async () => {
      mockSignIn.mockRejectedValue(new Error("Invalid credentials"));

      const { user } = render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      await user.type(screen.getByLabelText("Email"), "test@example.com");
      await user.type(screen.getByLabelText("Password"), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(
        () => {
          expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it("should not call signIn when form fields are empty", async () => {
      const { user } = render(<LoginForm onSwitchToSignUp={mockOnSwitchToSignUp} />);

      await user.click(screen.getByRole("button", { name: /sign in/i }));

      // Wait a bit to ensure the handler had time to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });
});
