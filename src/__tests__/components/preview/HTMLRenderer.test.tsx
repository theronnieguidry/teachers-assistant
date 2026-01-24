import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HTMLRenderer } from "@/components/preview/HTMLRenderer";

describe("HTMLRenderer", () => {
  it("renders an iframe", () => {
    render(<HTMLRenderer html="<p>Test content</p>" />);

    const iframe = screen.getByTitle("Content Preview");
    expect(iframe).toBeInTheDocument();
    expect(iframe.tagName).toBe("IFRAME");
  });

  it("applies sandbox attribute", () => {
    render(<HTMLRenderer html="<p>Test content</p>" />);

    const iframe = screen.getByTitle("Content Preview");
    expect(iframe).toHaveAttribute("sandbox", "allow-same-origin");
  });

  it("applies custom className", () => {
    render(<HTMLRenderer html="<p>Test</p>" className="custom-class" />);

    const iframe = screen.getByTitle("Content Preview");
    expect(iframe).toHaveClass("custom-class");
  });

  it("has default styling classes", () => {
    render(<HTMLRenderer html="<p>Test</p>" />);

    const iframe = screen.getByTitle("Content Preview");
    expect(iframe).toHaveClass("w-full");
    expect(iframe).toHaveClass("flex-1");
    expect(iframe).toHaveClass("border-0");
    expect(iframe).toHaveClass("bg-white");
  });
});
