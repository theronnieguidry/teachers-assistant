import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockChatCreate = vi.fn();

vi.mock("openai", () => {
  const MockOpenAI = vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockChatCreate,
      },
    },
  }));

  return { default: MockOpenAI };
});

describe("ImprovementService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-openai-key";
    delete process.env.OPENAI_MODEL;
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: "<html><body>Improved worksheet</body></html>" } }],
    });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
  });

  it("uses the shared premium default model for text improvements", async () => {
    const { ImprovementService } = await import("../../../services/premium/improvement-service.js");
    const service = new ImprovementService();

    const result = await service.applyImprovement({
      projectId: "project-1",
      versionId: "version-1",
      improvementType: "simplify",
      targetDocument: "worksheet",
      currentHtml: "<html><body>Original worksheet</body></html>",
      grade: "2",
      subject: "Math",
      options: {},
    });

    expect(result.improvedHtml).toContain("Improved worksheet");
    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4.1" })
    );
  });

  it("honors OPENAI_MODEL when the premium text model is overridden", async () => {
    process.env.OPENAI_MODEL = "gpt-4.1-mini";
    const { ImprovementService } = await import("../../../services/premium/improvement-service.js");
    const service = new ImprovementService();

    await service.applyImprovement({
      projectId: "project-1",
      versionId: "version-1",
      improvementType: "fix_confusing",
      targetDocument: "worksheet",
      currentHtml: "<html><body>Original worksheet</body></html>",
      grade: "2",
      subject: "Reading",
      options: {},
    });

    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gpt-4.1-mini" })
    );
  });
});
