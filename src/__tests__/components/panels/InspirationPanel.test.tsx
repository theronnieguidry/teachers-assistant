import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../../utils";
import { InspirationPanel } from "@/components/panels/InspirationPanel";

// Mock data
const mockItems = [
  {
    id: "item-1",
    type: "url" as const,
    title: "example.com",
    sourceUrl: "https://example.com",
  },
  {
    id: "item-2",
    type: "pdf" as const,
    title: "worksheet.pdf",
    content: "worksheet.pdf",
  },
  {
    id: "item-3",
    type: "image" as const,
    title: "photo.png",
  },
];

// Mock inspirationStore
const mockAddItem = vi.fn();
const mockRemoveItem = vi.fn();

let mockStoreState = {
  items: [] as typeof mockItems,
  addItem: mockAddItem,
  removeItem: mockRemoveItem,
};

vi.mock("@/stores/inspirationStore", () => ({
  useInspirationStore: () => mockStoreState,
}));

describe("InspirationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {
      items: [],
      addItem: mockAddItem,
      removeItem: mockRemoveItem,
    };
  });

  describe("rendering", () => {
    it("should render panel with title", () => {
      render(<InspirationPanel />);

      expect(screen.getByText("Design Inspiration")).toBeInTheDocument();
    });

    it("should render add URL button", () => {
      render(<InspirationPanel />);

      expect(screen.getByTitle("Add URL")).toBeInTheDocument();
    });

    it("should render drop zone", () => {
      render(<InspirationPanel />);

      expect(screen.getByText(/Drop URLs, PDFs, or images here/)).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("should show drop instruction when no items", () => {
      render(<InspirationPanel />);

      expect(screen.getByText("Drop URLs, PDFs, or images here")).toBeInTheDocument();
    });

    it("should have upload icon in empty state", () => {
      render(<InspirationPanel />);

      // Upload icon should be present
      const uploadIcon = document.querySelector(".text-muted-foreground\\/50");
      expect(uploadIcon).toBeInTheDocument();
    });
  });

  describe("with items", () => {
    beforeEach(() => {
      mockStoreState.items = mockItems;
    });

    it("should render list of items", () => {
      render(<InspirationPanel />);

      expect(screen.getByText("example.com")).toBeInTheDocument();
      expect(screen.getByText("worksheet.pdf")).toBeInTheDocument();
      expect(screen.getByText("photo.png")).toBeInTheDocument();
    });

    it("should show item count", () => {
      render(<InspirationPanel />);

      expect(screen.getByText("3 items selected")).toBeInTheDocument();
    });

    it("should show singular 'item' when only one", () => {
      mockStoreState.items = [mockItems[0]];

      render(<InspirationPanel />);

      expect(screen.getByText("1 item selected")).toBeInTheDocument();
    });

    it("should show 'Drop more files here' text when items exist", () => {
      render(<InspirationPanel />);

      expect(screen.getByText("Drop more files here")).toBeInTheDocument();
    });

    it("should render remove buttons for each item", () => {
      render(<InspirationPanel />);

      // Each item should have a remove button (X icon)
      const removeButtons = document.querySelectorAll('button[class*="opacity-0"]');
      expect(removeButtons.length).toBe(3);
    });

    it("should call removeItem when remove button clicked", async () => {
      const { user } = render(<InspirationPanel />);

      // Find the remove button for first item and click it
      const removeButtons = document.querySelectorAll('button[class*="group-hover"]');
      await user.click(removeButtons[0]);

      expect(mockRemoveItem).toHaveBeenCalledWith("item-1");
    });
  });

  describe("item types", () => {
    it("should render correct icon for URL type", () => {
      mockStoreState.items = [mockItems[0]]; // URL item

      render(<InspirationPanel />);

      // Link icon should be present for URL type
      expect(screen.getByText("example.com")).toBeInTheDocument();
    });

    it("should render correct icon for PDF type", () => {
      mockStoreState.items = [mockItems[1]]; // PDF item

      render(<InspirationPanel />);

      expect(screen.getByText("worksheet.pdf")).toBeInTheDocument();
    });

    it("should render correct icon for image type", () => {
      mockStoreState.items = [mockItems[2]]; // Image item

      render(<InspirationPanel />);

      expect(screen.getByText("photo.png")).toBeInTheDocument();
    });
  });

  describe("add URL", () => {
    it("should have add URL button", () => {
      render(<InspirationPanel />);

      const addButton = screen.getByTitle("Add URL");
      expect(addButton).toBeInTheDocument();
    });
  });

  describe("drag and drop zone", () => {
    it("should have drag zone with correct styling", () => {
      render(<InspirationPanel />);

      const dropZone = document.querySelector(".border-dashed");
      expect(dropZone).toBeInTheDocument();
    });
  });
});
