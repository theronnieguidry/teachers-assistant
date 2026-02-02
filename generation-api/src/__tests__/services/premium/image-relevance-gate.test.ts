/**
 * Tests for Image Relevance Gate Service
 */

import { describe, it, expect } from "vitest";
import {
  filterAndCapPlacements,
  checkRelevance,
  getCap,
  validatePlacementCount,
  sortByPriority,
  getFilterSummary,
  ALLOWED_PURPOSES,
  RICHNESS_CAPS,
  MAX_RICH_IMAGES,
  PURPOSE_SCORES,
} from "../../../services/premium/image-relevance-gate.js";
import type { ImagePlacement } from "../../../types/premium.js";

describe("Image Relevance Gate Service", () => {
  describe("constants", () => {
    it("should have correct richness caps", () => {
      expect(RICHNESS_CAPS.minimal).toBe(2);
      expect(RICHNESS_CAPS.standard).toBe(5);
      expect(RICHNESS_CAPS.rich).toBe("per-question");
    });

    it("should include instructionally useful purposes", () => {
      expect(ALLOWED_PURPOSES).toContain("counting_support");
      expect(ALLOWED_PURPOSES).toContain("phonics_cue");
      expect(ALLOWED_PURPOSES).toContain("shape_diagram");
      expect(ALLOWED_PURPOSES).toContain("diagram");
    });

    it("should not include decoration in allowed purposes", () => {
      expect(ALLOWED_PURPOSES).not.toContain("decoration");
    });

    it("should have higher scores for instructional purposes", () => {
      expect(PURPOSE_SCORES.counting_support).toBeGreaterThan(PURPOSE_SCORES.decoration);
      expect(PURPOSE_SCORES.diagram).toBeGreaterThan(PURPOSE_SCORES.illustration);
    });
  });

  describe("getCap", () => {
    it("should return 2 for minimal richness", () => {
      expect(getCap("minimal", 10)).toBe(2);
    });

    it("should return 5 for standard richness", () => {
      expect(getCap("standard", 10)).toBe(5);
    });

    it("should return question count for rich (up to max)", () => {
      expect(getCap("rich", 5)).toBe(5);
      expect(getCap("rich", 15)).toBe(MAX_RICH_IMAGES);
    });
  });

  describe("checkRelevance", () => {
    it("should approve counting_support purpose", () => {
      const placement: ImagePlacement = {
        afterItemId: "q1",
        description: "count the apples",
        purpose: "counting_support" as any,
        size: "medium",
      };

      const result = checkRelevance(placement);
      expect(result.approved).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });

    it("should reject decoration purpose", () => {
      const placement: ImagePlacement = {
        afterItemId: "q1",
        description: "pretty border design",
        purpose: "decoration",
        size: "medium",
      };

      const result = checkRelevance(placement);
      expect(result.approved).toBe(false);
      expect(result.purpose).toBe("decoration");
    });

    it("should approve diagrams", () => {
      const placement: ImagePlacement = {
        afterItemId: "q1",
        description: "diagram showing water cycle",
        purpose: "diagram",
        size: "medium",
      };

      const result = checkRelevance(placement);
      expect(result.approved).toBe(true);
    });

    it("should infer purpose from description keywords when no valid purpose provided", () => {
      const placement: ImagePlacement = {
        afterItemId: "q1",
        description: "counting objects in groups",
        purpose: "unknown" as any, // Invalid purpose to trigger inference
        size: "medium",
      };

      const result = checkRelevance(placement);
      expect(result.purpose).toBe("counting_support");
      expect(result.approved).toBe(true);
    });

    it("should use explicit purpose when valid purpose provided", () => {
      const placement: ImagePlacement = {
        afterItemId: "q1",
        description: "counting objects in groups",
        purpose: "illustration", // Explicit valid purpose takes precedence
        size: "medium",
      };

      const result = checkRelevance(placement);
      expect(result.purpose).toBe("illustration");
    });

    it("should approve illustrations with educational context", () => {
      const placement: ImagePlacement = {
        afterItemId: "q1",
        description: "picture showing math example",
        purpose: "illustration",
        size: "medium",
      };

      const result = checkRelevance(placement);
      // Has educational keyword "example" and "math"
      expect(result.approved).toBe(true);
    });
  });

  describe("filterAndCapPlacements", () => {
    it("should return empty results for empty placements", () => {
      const result = filterAndCapPlacements([], "standard", 10);
      expect(result.accepted).toHaveLength(0);
      expect(result.rejected).toHaveLength(0);
      expect(result.stats.total).toBe(0);
    });

    it("should enforce minimal cap of 2", () => {
      const placements: ImagePlacement[] = Array(5)
        .fill(null)
        .map((_, i) => ({
          afterItemId: `q${i + 1}`,
          description: `counting objects ${i + 1}`,
          purpose: "counting_support" as any,
          size: "medium" as const,
        }));

      const result = filterAndCapPlacements(placements, "minimal", 10);
      expect(result.accepted.length).toBeLessThanOrEqual(2);
      expect(result.stats.cap).toBe(2);
    });

    it("should enforce standard cap of 5", () => {
      const placements: ImagePlacement[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          afterItemId: `q${i + 1}`,
          description: `counting objects ${i + 1}`,
          purpose: "counting_support" as any,
          size: "medium" as const,
        }));

      const result = filterAndCapPlacements(placements, "standard", 10);
      expect(result.accepted.length).toBeLessThanOrEqual(5);
      expect(result.stats.cap).toBe(5);
    });

    it("should filter out decoration placements", () => {
      const placements: ImagePlacement[] = [
        {
          afterItemId: "q1",
          description: "counting apples",
          purpose: "counting_support" as any,
          size: "medium",
        },
        {
          afterItemId: "q2",
          description: "decorative border",
          purpose: "decoration",
          size: "medium",
        },
      ];

      const result = filterAndCapPlacements(placements, "standard", 10);
      expect(result.accepted).toHaveLength(1);
      expect(result.rejected).toHaveLength(1);
      expect(result.accepted[0].afterItemId).toBe("q1");
    });

    it("should skip non-allowed purposes in rich mode", () => {
      const placements: ImagePlacement[] = [
        {
          afterItemId: "q1",
          description: "counting apples",
          purpose: "counting_support" as any,
          size: "medium",
        },
        {
          afterItemId: "q2",
          description: "pretty border design",
          purpose: "decoration",
          size: "medium",
        },
        {
          afterItemId: "q3",
          description: "shape diagram of triangle",
          purpose: "shape_diagram" as any,
          size: "medium",
        },
        {
          afterItemId: "q4",
          description: "fun background art",
          purpose: "decoration",
          size: "wide",
        },
        {
          afterItemId: "q5",
          description: "phonics letter sound",
          purpose: "phonics_cue" as any,
          size: "small",
        },
      ];

      const result = filterAndCapPlacements(placements, "rich", 5);
      // Rich mode allows per-question, but decorations must be rejected
      expect(result.accepted).toHaveLength(3);
      expect(result.rejected).toHaveLength(2);
      const acceptedPurposes = result.accepted.map((p) => p.purpose);
      expect(acceptedPurposes).not.toContain("decoration");
      expect(acceptedPurposes).toContain("counting_support");
      expect(acceptedPurposes).toContain("shape_diagram");
      expect(acceptedPurposes).toContain("phonics_cue");
    });

    it("should prioritize higher-scoring purposes", () => {
      const placements: ImagePlacement[] = [
        {
          afterItemId: "q1",
          description: "generic illustration",
          purpose: "illustration",
          size: "medium",
        },
        {
          afterItemId: "q2",
          description: "counting objects",
          purpose: "counting_support" as any,
          size: "medium",
        },
        {
          afterItemId: "q3",
          description: "shape diagram",
          purpose: "shape_diagram" as any,
          size: "medium",
        },
      ];

      const result = filterAndCapPlacements(placements, "minimal", 10);
      // Should keep the two highest-scoring (counting_support and shape_diagram)
      expect(result.accepted).toHaveLength(2);
      const acceptedIds = result.accepted.map((p) => p.afterItemId);
      expect(acceptedIds).toContain("q2"); // counting_support
      expect(acceptedIds).toContain("q3"); // shape_diagram
    });
  });

  describe("validatePlacementCount", () => {
    it("should validate within cap", () => {
      const result = validatePlacementCount(3, "standard", 10);
      expect(result.valid).toBe(true);
      expect(result.cap).toBe(5);
    });

    it("should fail when over cap", () => {
      const result = validatePlacementCount(10, "minimal", 10);
      expect(result.valid).toBe(false);
      expect(result.message).toContain("Too many placements");
    });
  });

  describe("sortByPriority", () => {
    it("should sort by instructional value", () => {
      const placements: ImagePlacement[] = [
        {
          afterItemId: "q1",
          description: "decoration",
          purpose: "decoration",
          size: "medium",
        },
        {
          afterItemId: "q2",
          description: "counting",
          purpose: "counting_support" as any,
          size: "medium",
        },
      ];

      const sorted = sortByPriority(placements);
      expect(sorted[0].afterItemId).toBe("q2"); // Higher priority
      expect(sorted[1].afterItemId).toBe("q1"); // Lower priority
    });
  });

  describe("getFilterSummary", () => {
    it("should generate readable summary", () => {
      const result = filterAndCapPlacements(
        [
          {
            afterItemId: "q1",
            description: "counting",
            purpose: "counting_support" as any,
            size: "medium",
          },
        ],
        "standard",
        10
      );

      const summary = getFilterSummary(result);
      expect(summary).toContain("1/1");
      expect(summary).toContain("cap: 5");
    });
  });
});
