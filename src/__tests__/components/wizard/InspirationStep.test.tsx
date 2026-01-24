import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InspirationStep } from "@/components/wizard/InspirationStep";
import { useWizardStore } from "@/stores/wizardStore";
import { useInspirationStore } from "@/stores/inspirationStore";

describe("InspirationStep", () => {
  const mockNextStep = vi.fn();
  const mockPrevStep = vi.fn();
  const mockSetSelectedInspiration = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useWizardStore.setState({
      selectedInspiration: [],
      nextStep: mockNextStep,
      prevStep: mockPrevStep,
      setSelectedInspiration: mockSetSelectedInspiration,
    });
    useInspirationStore.setState({
      items: [],
    });
  });

  it("renders instructions text", () => {
    render(<InspirationStep />);

    expect(
      screen.getByText(/select inspiration items to guide the AI/i)
    ).toBeInTheDocument();
  });

  it("shows empty state when no inspiration items", () => {
    render(<InspirationStep />);

    expect(screen.getByText(/no inspiration items yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/drop URLs, PDFs, or images here/i)
    ).toBeInTheDocument();
  });

  it("shows Add URL button", () => {
    render(<InspirationStep />);

    expect(screen.getByRole("button", { name: /add url/i })).toBeInTheDocument();
  });

  it("renders Back and Skip buttons when no items", () => {
    render(<InspirationStep />);

    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("renders Next button when items are selected", () => {
    useWizardStore.setState({
      selectedInspiration: [
        { id: "1", type: "url", title: "Test URL", sourceUrl: "https://example.com" },
      ],
    });

    render(<InspirationStep />);

    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("calls prevStep when Back is clicked", async () => {
    const user = userEvent.setup();
    render(<InspirationStep />);

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(mockPrevStep).toHaveBeenCalled();
  });

  it("calls nextStep when Skip is clicked", async () => {
    const user = userEvent.setup();
    render(<InspirationStep />);

    await user.click(screen.getByRole("button", { name: /skip/i }));

    expect(mockNextStep).toHaveBeenCalled();
  });

  it("displays inspiration items from global store", () => {
    useInspirationStore.setState({
      items: [
        { id: "1", type: "url", title: "Math Website", sourceUrl: "https://math.com" },
        { id: "2", type: "pdf", title: "Lesson PDF", filePath: "/path/to/file.pdf" },
      ],
    });

    render(<InspirationStep />);

    expect(screen.getByText("Math Website")).toBeInTheDocument();
    expect(screen.getByText("Lesson PDF")).toBeInTheDocument();
  });

  it("displays item type labels", () => {
    useInspirationStore.setState({
      items: [
        { id: "1", type: "url", title: "Website", sourceUrl: "https://example.com" },
        { id: "2", type: "pdf", title: "Document", filePath: "/path/file.pdf" },
        { id: "3", type: "image", title: "Picture", filePath: "/path/image.png" },
      ],
    });

    render(<InspirationStep />);

    expect(screen.getByText("url")).toBeInTheDocument();
    expect(screen.getByText("pdf")).toBeInTheDocument();
    expect(screen.getByText("image")).toBeInTheDocument();
  });

  it("toggles item selection when clicked", async () => {
    const user = userEvent.setup();
    useInspirationStore.setState({
      items: [
        { id: "1", type: "url", title: "Test URL", sourceUrl: "https://example.com" },
      ],
    });

    render(<InspirationStep />);

    const item = screen.getByText("Test URL").closest("div[class*='cursor-pointer']");
    await user.click(item!);

    expect(mockSetSelectedInspiration).toHaveBeenCalledWith([
      { id: "1", type: "url", title: "Test URL", sourceUrl: "https://example.com" },
    ]);
  });

  it("deselects item when already selected", async () => {
    const user = userEvent.setup();
    const item = { id: "1", type: "url" as const, title: "Test URL", sourceUrl: "https://example.com" };
    useInspirationStore.setState({ items: [item] });
    useWizardStore.setState({ selectedInspiration: [item] });

    render(<InspirationStep />);

    const itemElement = screen.getByText("Test URL").closest("div[class*='cursor-pointer']");
    await user.click(itemElement!);

    expect(mockSetSelectedInspiration).toHaveBeenCalledWith([]);
  });

  it("shows selection count when items are selected", () => {
    useWizardStore.setState({
      selectedInspiration: [
        { id: "1", type: "url", title: "Item 1", sourceUrl: "https://a.com" },
        { id: "2", type: "url", title: "Item 2", sourceUrl: "https://b.com" },
      ],
    });

    render(<InspirationStep />);

    expect(screen.getByText("2 items selected")).toBeInTheDocument();
  });

  it("shows singular form for single selection", () => {
    useWizardStore.setState({
      selectedInspiration: [
        { id: "1", type: "url", title: "Item 1", sourceUrl: "https://a.com" },
      ],
    });

    render(<InspirationStep />);

    expect(screen.getByText("1 item selected")).toBeInTheDocument();
  });

  it("calls nextStep when Next is clicked with selections", async () => {
    const user = userEvent.setup();
    useWizardStore.setState({
      selectedInspiration: [
        { id: "1", type: "url", title: "Test", sourceUrl: "https://example.com" },
      ],
    });

    render(<InspirationStep />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(mockNextStep).toHaveBeenCalled();
  });
});
