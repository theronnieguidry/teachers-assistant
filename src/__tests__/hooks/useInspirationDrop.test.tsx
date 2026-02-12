import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useInspirationDrop } from "@/hooks/useInspirationDrop";
import { readFileAsBase64 } from "@/lib/file-encoding";

vi.mock("@/lib/file-encoding", () => ({
  readFileAsBase64: vi.fn(),
}));

function DropHarness({
  onAddItem,
  onItemsAdded,
}: {
  onAddItem: (item: unknown) => Promise<unknown> | unknown;
  onItemsAdded?: (items: unknown[]) => Promise<void> | void;
}) {
  const { isDragging, handleDrop, handleDragOver, handleDragLeave } = useInspirationDrop({
    onAddItem,
    onItemsAdded,
  });

  return (
    <div
      data-testid="drop-zone"
      data-dragging={isDragging ? "true" : "false"}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    />
  );
}

describe("useInspirationDrop", () => {
  it("processes dropped URL text and reports added items", async () => {
    const onAddItem = vi.fn(async (item) => ({ id: "new-item", ...(item as Record<string, unknown>) }));
    const onItemsAdded = vi.fn();

    render(<DropHarness onAddItem={onAddItem} onItemsAdded={onItemsAdded} />);
    const zone = screen.getByTestId("drop-zone");

    fireEvent.drop(zone, {
      dataTransfer: {
        files: [],
        getData: (type: string) => (type === "text/plain" ? "https://example.com/resource" : ""),
      },
    });

    await waitFor(() => {
      expect(onAddItem).toHaveBeenCalledWith({
        type: "url",
        title: "example.com",
        sourceUrl: "https://example.com/resource",
      });
      expect(onItemsAdded).toHaveBeenCalledWith([
        expect.objectContaining({ id: "new-item", type: "url" }),
      ]);
    });
  });

  it("processes dropped PDFs and tracks drag state", async () => {
    vi.mocked(readFileAsBase64).mockResolvedValue("pdf-base64");
    const onAddItem = vi.fn(async (item) => ({ id: "pdf-item", ...(item as Record<string, unknown>) }));

    render(<DropHarness onAddItem={onAddItem} />);
    const zone = screen.getByTestId("drop-zone");
    const pdf = new File(["%PDF"], "sample.pdf", { type: "application/pdf" });

    fireEvent.dragOver(zone, {
      dataTransfer: { files: [pdf], getData: () => "" },
    });
    expect(zone.getAttribute("data-dragging")).toBe("true");

    fireEvent.dragLeave(zone, {
      dataTransfer: { files: [pdf], getData: () => "" },
    });
    expect(zone.getAttribute("data-dragging")).toBe("false");

    fireEvent.drop(zone, {
      dataTransfer: {
        files: [pdf],
        getData: () => "",
      },
    });

    await waitFor(() => {
      expect(onAddItem).toHaveBeenCalledWith({
        type: "pdf",
        title: "sample.pdf",
        content: "pdf-base64",
      });
    });
  });
});
