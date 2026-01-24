import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn utility", () => {
  it("should merge class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle undefined values", () => {
    const result = cn("foo", undefined, "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle null values", () => {
    const result = cn("foo", null, "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle boolean values", () => {
    const result = cn("foo", false && "bar", true && "baz");
    expect(result).toBe("foo baz");
  });

  it("should merge tailwind classes correctly", () => {
    // tailwind-merge should dedupe conflicting classes
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });

  it("should handle arrays", () => {
    const result = cn(["foo", "bar"], "baz");
    expect(result).toBe("foo bar baz");
  });

  it("should handle objects with boolean values", () => {
    const result = cn({
      foo: true,
      bar: false,
      baz: true,
    });
    expect(result).toBe("foo baz");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });

  it("should handle complex tailwind merging", () => {
    // Background colors should be merged
    const result = cn("bg-red-500", "bg-blue-500");
    expect(result).toBe("bg-blue-500");
  });

  it("should preserve non-conflicting classes", () => {
    const result = cn("text-sm font-bold", "text-center");
    expect(result).toBe("text-sm font-bold text-center");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn(
      "base-class",
      isActive && "active-class",
      isDisabled && "disabled-class"
    );

    expect(result).toBe("base-class active-class");
  });
});
