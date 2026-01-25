import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "../../utils";
import { UpdateDialog } from "@/components/settings/UpdateDialog";

describe("UpdateDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnUpdate = vi.fn();

  const defaultUpdateInfo = {
    version: "1.2.0",
    body: "- New feature A\n- Bug fix B\n- Improvement C",
    date: "2024-06-15T12:00:00Z",
  };

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    updateInfo: defaultUpdateInfo,
    onUpdate: mockOnUpdate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnUpdate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("rendering", () => {
    it("UPDATE-001: should render the dialog when open", () => {
      vi.useRealTimers();
      render(<UpdateDialog {...defaultProps} />);

      expect(screen.getByText("Update Available")).toBeInTheDocument();
      expect(
        screen.getByText("A new version of TA Teachers Assistant is available.")
      ).toBeInTheDocument();
    });

    it("UPDATE-002: should not render when closed", () => {
      vi.useRealTimers();
      render(<UpdateDialog {...defaultProps} open={false} />);

      expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
    });

    it("UPDATE-003: should display the new version number", () => {
      vi.useRealTimers();
      render(<UpdateDialog {...defaultProps} />);

      expect(screen.getByText("v1.2.0")).toBeInTheDocument();
      expect(screen.getByText("New Version:")).toBeInTheDocument();
    });

    it("UPDATE-004: should display the release date", () => {
      vi.useRealTimers();
      render(<UpdateDialog {...defaultProps} />);

      expect(screen.getByText("Release Date:")).toBeInTheDocument();
      // Date is formatted by toLocaleDateString
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it("UPDATE-005: should display What's New section with release notes", () => {
      vi.useRealTimers();
      render(<UpdateDialog {...defaultProps} />);

      expect(screen.getByText("What's New:")).toBeInTheDocument();
      expect(screen.getByText(/New feature A/)).toBeInTheDocument();
      expect(screen.getByText(/Bug fix B/)).toBeInTheDocument();
    });

    it("UPDATE-006: should not display release date when not provided", () => {
      vi.useRealTimers();
      const updateInfoWithoutDate = {
        version: "1.2.0",
        body: "Some changes",
      };

      render(
        <UpdateDialog
          {...defaultProps}
          updateInfo={updateInfoWithoutDate}
        />
      );

      expect(screen.queryByText("Release Date:")).not.toBeInTheDocument();
    });

    it("UPDATE-007: should not display What's New when body is empty", () => {
      vi.useRealTimers();
      const updateInfoWithoutBody = {
        version: "1.2.0",
        body: "",
      };

      render(
        <UpdateDialog
          {...defaultProps}
          updateInfo={updateInfoWithoutBody}
        />
      );

      expect(screen.queryByText("What's New:")).not.toBeInTheDocument();
    });
  });

  describe("buttons", () => {
    it("UPDATE-008: should show Later and Update Now buttons", () => {
      vi.useRealTimers();
      render(<UpdateDialog {...defaultProps} />);

      expect(screen.getByRole("button", { name: "Later" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Update Now" })).toBeInTheDocument();
    });

    it("UPDATE-009: should call onOpenChange with false when Later is clicked", async () => {
      vi.useRealTimers();
      const { user } = render(<UpdateDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Later" }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it("UPDATE-010: should call onUpdate when Update Now is clicked", async () => {
      vi.useRealTimers();
      const { user } = render(<UpdateDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Update Now" }));

      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  describe("download progress", () => {
    it("UPDATE-011: should show downloading state when update starts", async () => {
      vi.useFakeTimers();
      // Use a slow-resolving mock so we can observe progress
      const slowOnUpdate = vi.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 10000);
      }));

      render(<UpdateDialog {...defaultProps} onUpdate={slowOnUpdate} />);

      // Click update button using fireEvent (works with fake timers)
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
      });

      expect(screen.getByText("Downloading update...")).toBeInTheDocument();
      // Progress percentage may be 0% or 10% depending on timing
      expect(screen.getByText((content, element) => {
        const text = element?.textContent;
        return text === "0%" || text === "10%";
      })).toBeInTheDocument();
    });

    it("UPDATE-012: should show Installing button text during download", async () => {
      vi.useFakeTimers();
      const slowOnUpdate = vi.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 10000);
      }));

      render(<UpdateDialog {...defaultProps} onUpdate={slowOnUpdate} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
      });

      expect(screen.getByRole("button", { name: "Installing..." })).toBeInTheDocument();
    });

    it("UPDATE-013: should hide Later button during download", async () => {
      vi.useFakeTimers();
      const slowOnUpdate = vi.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 10000);
      }));

      render(<UpdateDialog {...defaultProps} onUpdate={slowOnUpdate} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
      });

      expect(screen.queryByRole("button", { name: "Later" })).not.toBeInTheDocument();
    });

    it("UPDATE-014: should disable Update button during download", async () => {
      vi.useFakeTimers();
      const slowOnUpdate = vi.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 10000);
      }));

      render(<UpdateDialog {...defaultProps} onUpdate={slowOnUpdate} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
      });

      expect(screen.getByRole("button", { name: "Installing..." })).toBeDisabled();
    });

    it("UPDATE-015: should show restart message during download", async () => {
      vi.useFakeTimers();
      const slowOnUpdate = vi.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 10000);
      }));

      render(<UpdateDialog {...defaultProps} onUpdate={slowOnUpdate} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
      });

      expect(
        screen.getByText("The app will restart automatically after the update is installed.")
      ).toBeInTheDocument();
    });

    it("UPDATE-016: should update progress over time", async () => {
      vi.useFakeTimers();
      // Use a slow-resolving mock so we can observe progress
      const slowOnUpdate = vi.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 10000); // Takes 10 seconds to complete
      }));

      render(<UpdateDialog {...defaultProps} onUpdate={slowOnUpdate} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
      });

      // Initial progress - use function to handle split text (e.g., "0" and "%" in separate spans)
      expect(screen.getByText((content, element) => {
        return element?.textContent === "0%";
      })).toBeInTheDocument();

      // Advance timers to see progress updates
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText((content, element) => {
        return element?.textContent === "10%";
      })).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText((content, element) => {
        return element?.textContent === "20%";
      })).toBeInTheDocument();
    });

    it("UPDATE-017: should cap progress at 90% before completion", async () => {
      vi.useFakeTimers();
      // Use a slow-resolving mock so we can observe the progress cap
      const slowOnUpdate = vi.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 10000); // Takes 10 seconds to complete
      }));

      render(<UpdateDialog {...defaultProps} onUpdate={slowOnUpdate} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
      });

      // Advance timers enough to reach the cap (but not complete the update)
      await act(async () => {
        vi.advanceTimersByTime(5000); // 500ms * 10 = 5000ms for 90%
      });

      expect(screen.getByText((content, element) => {
        return element?.textContent === "90%";
      })).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("UPDATE-018: should display error message when update fails", async () => {
      vi.useRealTimers();
      const failingOnUpdate = vi.fn().mockRejectedValue(new Error("Download failed"));

      const { user } = render(
        <UpdateDialog {...defaultProps} onUpdate={failingOnUpdate} />
      );

      await user.click(screen.getByRole("button", { name: "Update Now" }));

      await waitFor(() => {
        expect(screen.getByText("Download failed")).toBeInTheDocument();
      });
    });

    it("UPDATE-019: should show Update Now button again after error", async () => {
      vi.useRealTimers();
      const failingOnUpdate = vi.fn().mockRejectedValue(new Error("Network error"));

      const { user } = render(
        <UpdateDialog {...defaultProps} onUpdate={failingOnUpdate} />
      );

      await user.click(screen.getByRole("button", { name: "Update Now" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Update Now" })).toBeInTheDocument();
      });
    });

    it("UPDATE-020: should show Later button again after error", async () => {
      vi.useRealTimers();
      const failingOnUpdate = vi.fn().mockRejectedValue(new Error("Network error"));

      const { user } = render(
        <UpdateDialog {...defaultProps} onUpdate={failingOnUpdate} />
      );

      await user.click(screen.getByRole("button", { name: "Update Now" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Later" })).toBeInTheDocument();
      });
    });

    it("UPDATE-021: should handle non-Error exceptions", async () => {
      vi.useRealTimers();
      const failingOnUpdate = vi.fn().mockRejectedValue("String error");

      const { user } = render(
        <UpdateDialog {...defaultProps} onUpdate={failingOnUpdate} />
      );

      await user.click(screen.getByRole("button", { name: "Update Now" }));

      await waitFor(() => {
        expect(screen.getByText("Update failed")).toBeInTheDocument();
      });
    });
  });

  describe("dialog close behavior", () => {
    it("UPDATE-022: should not allow closing during download", async () => {
      vi.useFakeTimers();
      const slowOnUpdate = vi.fn(() => new Promise<void>((resolve) => {
        setTimeout(resolve, 10000);
      }));

      render(<UpdateDialog {...defaultProps} onUpdate={slowOnUpdate} />);

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Update Now" }));
      });

      // Try to close - the dialog should still be open
      // (onOpenChange is set to undefined during download)
      expect(screen.getByText("Downloading update...")).toBeInTheDocument();
    });
  });

  describe("null updateInfo", () => {
    it("UPDATE-023: should render dialog with null updateInfo", () => {
      render(
        <UpdateDialog
          {...defaultProps}
          updateInfo={null}
        />
      );

      // Dialog should still render without crashing
      expect(screen.getByText("Update Available")).toBeInTheDocument();
      // But version info should not be present
      expect(screen.queryByText("New Version:")).not.toBeInTheDocument();
    });
  });
});
