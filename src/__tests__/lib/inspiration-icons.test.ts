import { describe, expect, it } from "vitest";
import { FileText, Image, Link } from "lucide-react";
import { getInspirationIcon } from "@/lib/inspiration-icons";

describe("getInspirationIcon", () => {
  it("returns Link icon for url items", () => {
    expect(getInspirationIcon("url")).toBe(Link);
  });

  it("returns Image icon for image items", () => {
    expect(getInspirationIcon("image")).toBe(Image);
  });

  it("returns FileText icon for pdf and unknown types", () => {
    expect(getInspirationIcon("pdf")).toBe(FileText);
    expect(getInspirationIcon("text")).toBe(FileText);
    expect(getInspirationIcon("unknown")).toBe(FileText);
  });
});
