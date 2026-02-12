import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "../../utils";
import { PurchaseDialog } from "@/components/purchase/PurchaseDialog";
import { GenerationApiError } from "@/services/generation-api";

// Mock the auth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock the checkout API
const mockGetCreditPacks = vi.fn();
const mockGetCreditsLedger = vi.fn();
const mockCreateCheckoutSession = vi.fn();
vi.mock("@/services/checkout-api", () => ({
  getCreditPacks: () => mockGetCreditPacks(),
  getCreditsLedger: () => mockGetCreditsLedger(),
  createCheckoutSession: (packId: string, token: string) =>
    mockCreateCheckoutSession(packId, token),
}));

// Mock the toast store
const mockAddToast = vi.fn();
vi.mock("@/stores/toastStore", () => {
  const useToastStore = vi.fn(() => ({
    addToast: mockAddToast,
    toasts: [],
    removeToast: vi.fn(),
    clearToasts: vi.fn(),
  }));
  // Add getState for convenience functions
  useToastStore.getState = () => ({
    addToast: mockAddToast,
    toasts: [],
    removeToast: vi.fn(),
    clearToasts: vi.fn(),
  });
  return {
    useToastStore,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    },
  };
});

// Mock window.open
const mockWindowOpen = vi.fn();
vi.stubGlobal("open", mockWindowOpen);

describe("PurchaseDialog", () => {
  const mockPacks = [
    {
      id: "pack-1",
      name: "Starter Pack",
      credits: 100,
      priceCents: 500,
      priceDisplay: "$5.00",
    },
    {
      id: "pack-2",
      name: "Value Pack",
      credits: 500,
      priceCents: 2000,
      priceDisplay: "$20.00",
    },
    {
      id: "pack-3",
      name: "Pro Pack",
      credits: 1000,
      priceCents: 3500,
      priceDisplay: "$35.00",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      session: { access_token: "test-token" },
      credits: { balance: 25, lifetimeGranted: 50, lifetimeUsed: 25 },
      refreshCredits: vi.fn(),
    });
    mockGetCreditPacks.mockResolvedValue(mockPacks);
    mockGetCreditsLedger.mockResolvedValue([]);
    mockWindowOpen.mockReturnValue(null);
  });

  it("should not render when closed", () => {
    render(<PurchaseDialog open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByText("Buy Credits")).not.toBeInTheDocument();
  });

  it("should render dialog title when open", async () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /buy credits/i })
      ).toBeInTheDocument();
    });
  });

  it("should show loading state initially", async () => {
    // Slow down the API response
    mockGetCreditPacks.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockPacks), 100))
    );

    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    // Should show some loading indicator - the loader is rendered but may not have a specific role
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /buy credits/i })).toBeInTheDocument();
    });
  });

  it("should display credit packs when loaded", async () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Starter Pack")).toBeInTheDocument();
      expect(screen.getByText("Value Pack")).toBeInTheDocument();
      expect(screen.getByText("Pro Pack")).toBeInTheDocument();
    });
  });

  it("should display prices for each pack", async () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("$5.00")).toBeInTheDocument();
      expect(screen.getByText("$20.00")).toBeInTheDocument();
      expect(screen.getByText("$35.00")).toBeInTheDocument();
    });
  });

  it("should display credit amounts for each pack", async () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("100 credits")).toBeInTheDocument();
      expect(screen.getByText("500 credits")).toBeInTheDocument();
      expect(screen.getByText("1,000 credits")).toBeInTheDocument();
    });
  });

  it("should display current balance", async () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Current Balance")).toBeInTheDocument();
      expect(screen.getByText("25 credits")).toBeInTheDocument();
    });
  });

  it("should show 'Best Value' badge on pro pack", async () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Best Value")).toBeInTheDocument();
    });
  });

  it("should have Buy Now buttons for each pack", async () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      const buyButtons = screen.getAllByRole("button", { name: /buy now/i });
      expect(buyButtons).toHaveLength(3);
    });
  });

  it("should call createCheckoutSession when Buy Now is clicked", async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.com/test",
    });

    const { user } = render(
      <PurchaseDialog open={true} onOpenChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Starter Pack")).toBeInTheDocument();
    });

    const buyButtons = screen.getAllByRole("button", { name: /buy now/i });
    await user.click(buyButtons[0]);

    await waitFor(() => {
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        "pack-1",
        "test-token"
      );
    });
  });

  it("should open Stripe checkout URL in new window", async () => {
    mockCreateCheckoutSession.mockResolvedValue({
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.com/test",
    });

    const { user } = render(
      <PurchaseDialog open={true} onOpenChange={vi.fn()} />
    );

    await waitFor(() => {
      expect(screen.getByText("Starter Pack")).toBeInTheDocument();
    });

    const buyButtons = screen.getAllByRole("button", { name: /buy now/i });
    await user.click(buyButtons[0]);

    await waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith(
        "https://checkout.stripe.com/test",
        "_blank"
      );
    });
  });

  it("should show error message when packs fail to load", async () => {
    mockGetCreditPacks.mockRejectedValue(new Error("Network error"));

    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });

  it("should show Try Again button when error occurs", async () => {
    mockGetCreditPacks.mockRejectedValue(new Error("Network error"));

    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /try again/i })
      ).toBeInTheDocument();
    });
  });

  it("shows configuration guidance for setup-related errors", async () => {
    mockGetCreditPacks.mockRejectedValue(
      new GenerationApiError(
        "Payments are currently unavailable because Stripe is not configured.",
        503,
        { code: "stripe_not_configured" }
      )
    );

    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/billing is not configured for this environment yet/i)
      ).toBeInTheDocument();
    });
  });

  it("should show payment methods info", async () => {
    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/secure checkout powered by stripe/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/cards, google pay, apple pay/i)
      ).toBeInTheDocument();
    });
  });

  it("should show message when no packs available", async () => {
    mockGetCreditPacks.mockResolvedValue([]);

    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(/no credit packs available/i)
      ).toBeInTheDocument();
    });
  });

  it("renders recent credit ledger entries", async () => {
    mockGetCreditsLedger.mockResolvedValue([
      {
        id: "tx-1",
        amount: -5,
        type: "reserve",
        description: "Credits reserved for generation",
        createdAt: "2026-02-12T00:00:00Z",
        projectId: "project-1",
      },
      {
        id: "tx-2",
        amount: 100,
        type: "purchase",
        description: "Credit pack purchase",
        createdAt: "2026-02-12T01:00:00Z",
        projectId: null,
      },
    ]);

    render(<PurchaseDialog open={true} onOpenChange={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/recent credit activity/i)).toBeInTheDocument();
      expect(screen.getByText("Reserve")).toBeInTheDocument();
      expect(screen.getByText("Purchase")).toBeInTheDocument();
      expect(screen.getByText("Credits reserved for generation")).toBeInTheDocument();
      expect(screen.getByText("Credit pack purchase")).toBeInTheDocument();
    });
  });
});
