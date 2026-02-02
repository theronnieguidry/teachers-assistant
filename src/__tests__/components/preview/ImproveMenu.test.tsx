import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImproveMenu } from "@/components/preview/ImproveMenu";

// Mock the stores
vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(() => ({
    session: { access_token: "test-token" },
  })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    credits: { balance: 50 },
  })),
}));

// Mock the toast
vi.mock("@/stores/toastStore", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the improve API
vi.mock("@/services/improve-api", () => ({
  applyImprovement: vi.fn().mockResolvedValue({
    newVersionId: "new-version-123",
    creditsUsed: 2,
    changes: ["Simplified vocabulary"],
  }),
  IMPROVEMENT_OPTIONS: [
    {
      type: "fix_confusing",
      label: "Fix Confusing Questions",
      description: "Reword unclear questions",
      estimatedCredits: 1,
    },
    {
      type: "simplify",
      label: "Simplify Content",
      description: "Lower vocabulary level",
      estimatedCredits: 2,
    },
    {
      type: "add_visuals",
      label: "Add More Images",
      description: "Generate more images",
      estimatedCredits: 4,
    },
  ],
  ImproveApiError: class extends Error {
    constructor(message: string, public statusCode: number) {
      super(message);
    }
  },
}));

describe("ImproveMenu", () => {
  const defaultProps = {
    projectId: "project-123",
    versionId: "version-123",
    activeTab: "worksheet" as const,
    onImproved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders improve button", () => {
    render(<ImproveMenu {...defaultProps} />);

    expect(screen.getByRole("button", { name: /improve/i })).toBeInTheDocument();
  });

  it("disables button when disabled prop is true", () => {
    render(<ImproveMenu {...defaultProps} disabled={true} />);

    expect(screen.getByRole("button", { name: /improve/i })).toBeDisabled();
  });

  // Note: Radix UI DropdownMenu dropdown interaction tests are skipped because
  // JSDOM doesn't support hasPointerCapture which Radix relies on.
  // These interactions are better tested in E2E tests.
  // Skipped tests:
  // - shows dropdown menu when button is clicked
  // - shows credit cost for each option
  // - opens confirmation dialog when option is selected
  // - shows additional instructions textarea in dialog
  // - shows current balance in dialog
  // - calls onImproved when improvement is applied
  // - closes dialog when cancel is clicked
  // - shows document type label in dropdown
});
