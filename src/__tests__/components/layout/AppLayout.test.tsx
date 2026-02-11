import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppLayout } from "@/components/layout/AppLayout";

// Mock tauri-bridge
const mockCheckForUpdates = vi.fn();
const mockDownloadAndInstallUpdate = vi.fn();
vi.mock("@/services/tauri-bridge", () => ({
  checkForUpdates: () => mockCheckForUpdates(),
  downloadAndInstallUpdate: () => mockDownloadAndInstallUpdate(),
}));

// Mock child components to isolate AppLayout tests
vi.mock("@/components/layout/Header", () => ({
  Header: () => <header data-testid="header">Header</header>,
}));

vi.mock("@/components/layout/Sidebar", () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

vi.mock("@/components/settings", () => ({
  UpdateDialog: ({ open }: { open: boolean }) => {
    return open ? <div data-testid="update-dialog" role="dialog">Update Dialog</div> : null;
  },
}));

describe("AppLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no updates available
    mockCheckForUpdates.mockResolvedValue({ available: false });
  });

  describe("basic rendering", () => {
    it("renders Header component", () => {
      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId("header")).toBeInTheDocument();
    });

    it("renders Sidebar component", () => {
      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    });

    it("renders main content area with children", () => {
      render(
        <AppLayout>
          <div data-testid="child-content">Child Content</div>
        </AppLayout>
      );

      expect(screen.getByTestId("child-content")).toBeInTheDocument();
      expect(screen.getByRole("main")).toContainElement(screen.getByTestId("child-content"));
    });

    it("applies correct layout structure", () => {
      const { container } = render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      // Check for flex layout structure
      const rootDiv = container.firstChild as HTMLElement;
      expect(rootDiv).toHaveClass("min-h-screen", "flex", "flex-col");
    });
  });

  describe("layout accessibility", () => {
    it("has a main landmark", () => {
      render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      expect(screen.getByRole("main")).toBeInTheDocument();
    });

    it("renders content in correct order (header, sidebar, main)", () => {
      const { container } = render(
        <AppLayout>
          <div>Content</div>
        </AppLayout>
      );

      const header = screen.getByTestId("header");
      const sidebar = screen.getByTestId("sidebar");
      const main = screen.getByRole("main");

      // Verify DOM order
      const allElements = container.querySelectorAll("[data-testid], main");
      const headerIndex = Array.from(allElements).indexOf(header);
      const sidebarIndex = Array.from(allElements).indexOf(sidebar);
      const mainIndex = Array.from(allElements).indexOf(main);

      expect(headerIndex).toBeLessThan(sidebarIndex);
      expect(sidebarIndex).toBeLessThan(mainIndex);
    });
  });
});
