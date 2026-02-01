import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/Header";

// Mock useAuth hook
const mockSignOut = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { email: "test@example.com" },
    credits: { balance: 50, lifetimeGranted: 100, lifetimeUsed: 50 },
    signOut: mockSignOut,
  }),
}));

// Mock settings components
vi.mock("@/components/settings", () => ({
  OllamaSetup: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    return open ? (
      <div data-testid="ollama-setup-dialog" role="dialog">
        <button onClick={() => onOpenChange(false)}>Close Setup</button>
      </div>
    ) : null;
  },
  UpdateDialog: ({ open }: { open: boolean }) => {
    return open ? <div data-testid="update-dialog" role="dialog">Update Dialog</div> : null;
  },
}));

// Mock purchase components
vi.mock("@/components/purchase", () => ({
  PurchaseDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    return open ? (
      <div data-testid="purchase-dialog" role="dialog">
        <button onClick={() => onOpenChange(false)}>Close Purchase</button>
      </div>
    ) : null;
  },
}));

// Mock feedback components
vi.mock("@/components/feedback", () => ({
  FeedbackButton: () => <button data-testid="feedback-button">Feedback</button>,
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("branding", () => {
    it("displays TA logo text", () => {
      render(<Header />);

      expect(screen.getByText("TA")).toBeInTheDocument();
    });

    it("displays Teacher's Assistant text on larger screens", () => {
      render(<Header />);

      expect(screen.getByText("Teacher's Assistant")).toBeInTheDocument();
    });
  });

  describe("credits display", () => {
    it("shows credits balance regardless of provider setting", () => {
      render(<Header />);

      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("has accessible aria-label on credits button", () => {
      render(<Header />);

      // Credits badge is now a clickable button
      const creditsButton = screen.getByRole("button", { name: /premium ai credits: 50/i });
      expect(creditsButton).toBeInTheDocument();
    });

    it("opens purchase dialog when credits button is clicked", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const creditsButton = screen.getByRole("button", { name: /premium ai credits: 50/i });
      await user.click(creditsButton);

      expect(screen.getByTestId("purchase-dialog")).toBeInTheDocument();
    });
  });

  describe("settings button", () => {
    it("renders settings button with correct title", () => {
      render(<Header />);

      const settingsButton = screen.getByTitle("Local AI Setup");
      expect(settingsButton).toBeInTheDocument();
    });

    it("opens Ollama setup dialog when clicked", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const settingsButton = screen.getByTitle("Local AI Setup");
      await user.click(settingsButton);

      expect(screen.getByTestId("ollama-setup-dialog")).toBeInTheDocument();
    });

    it("closes Ollama setup dialog when close is triggered", async () => {
      const user = userEvent.setup();
      render(<Header />);

      // Open the dialog
      const settingsButton = screen.getByTitle("Local AI Setup");
      await user.click(settingsButton);
      expect(screen.getByTestId("ollama-setup-dialog")).toBeInTheDocument();

      // Close the dialog
      await user.click(screen.getByRole("button", { name: "Close Setup" }));
      expect(screen.queryByTestId("ollama-setup-dialog")).not.toBeInTheDocument();
    });
  });

  describe("user info", () => {
    it("displays user email", () => {
      render(<Header />);

      expect(screen.getByText("test@example.com")).toBeInTheDocument();
    });

    it("renders sign out button with correct title", () => {
      render(<Header />);

      const signOutButton = screen.getByTitle("Sign out");
      expect(signOutButton).toBeInTheDocument();
    });

    it("calls signOut when sign out button is clicked", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const signOutButton = screen.getByTitle("Sign out");
      await user.click(signOutButton);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe("accessibility", () => {
    it("header element is present", () => {
      render(<Header />);

      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("buttons have accessible names via title attributes", () => {
      render(<Header />);

      expect(screen.getByTitle("Local AI Setup")).toBeInTheDocument();
      expect(screen.getByTitle("Sign out")).toBeInTheDocument();
    });
  });
});
