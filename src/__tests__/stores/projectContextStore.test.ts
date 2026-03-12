import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjectContextStore } from "@/stores/projectContextStore";
import { getLocalProjects } from "@/services/local-project-storage";
import { getArtifact } from "@/services/library-storage";
import type { Project } from "@/types";

vi.mock("@/services/local-project-storage", () => ({
  getLocalProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/services/library-storage", () => ({
  getArtifact: vi.fn().mockResolvedValue(null),
}));

const remoteProject: Project = {
  id: "remote-project-1",
  userId: "user-1",
  title: "Math Project",
  description: null,
  prompt: "Create math work",
  grade: "2",
  subject: "Math",
  options: {},
  inspiration: [],
  outputPath: null,
  status: "completed",
  errorMessage: null,
  creditsUsed: 0,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-02T00:00:00Z"),
  completedAt: new Date("2026-01-03T00:00:00Z"),
};

describe("projectContextStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useProjectContextStore.setState({
      contexts: {},
      migration: {
        version: 0,
        unmappedLegacyProjectIds: [],
      },
    });
  });

  it("tracks the most recently used project", () => {
    useProjectContextStore.getState().upsertContext("project-1", {
      type: "quick_create",
      lastUsedAt: "2026-01-01T00:00:00Z",
    });
    useProjectContextStore.getState().upsertContext("project-2", {
      type: "learning_path",
      learnerId: "learner-1",
      lastUsedAt: "2026-01-02T00:00:00Z",
    });

    expect(useProjectContextStore.getState().getLastUsedProjectId()).toBe("project-2");
    expect(
      useProjectContextStore.getState().getLastUsedProjectId({
        learnerId: "learner-1",
        preferredType: "learning_path",
      })
    ).toBe("project-2");
  });

  it("links objectives and default design packs to canonical projects", () => {
    useProjectContextStore.getState().markProjectUsed("project-1", {
      type: "quick_create",
    });
    useProjectContextStore.getState().linkObjective("project-1", "math_2_01");
    useProjectContextStore.getState().linkObjective("project-1", "math_2_01");
    useProjectContextStore.getState().setDefaultDesignPack("project-1", "pack-1");

    const context = useProjectContextStore.getState().getContext("project-1");
    expect(context?.linkedObjectiveIds).toEqual(["math_2_01"]);
    expect(context?.defaultDesignPackId).toBe("pack-1");
  });

  it("preserves existing type and learnerId when markProjectUsed receives undefined seed fields", () => {
    useProjectContextStore.getState().upsertContext("project-1", {
      type: "learning_path",
      learnerId: "learner-1",
      linkedObjectiveIds: ["math_2_01"],
      defaultDesignPackId: "pack-1",
      lastUsedAt: "2026-01-01T00:00:00Z",
    });

    const before = useProjectContextStore.getState().getContext("project-1");
    useProjectContextStore.getState().markProjectUsed("project-1", {
      type: undefined,
      learnerId: undefined,
    });

    const after = useProjectContextStore.getState().getContext("project-1");
    expect(after).toMatchObject({
      type: "learning_path",
      learnerId: "learner-1",
      linkedObjectiveIds: ["math_2_01"],
      defaultDesignPackId: "pack-1",
    });
    expect(new Date(after?.lastUsedAt || 0).getTime()).toBeGreaterThan(
      new Date(before?.lastUsedAt || 0).getTime()
    );
  });

  it("migrates legacy unified projects onto canonical project ids", async () => {
    vi.mocked(getLocalProjects).mockResolvedValue([
      {
        projectId: "legacy-1",
        type: "learning_path",
        name: "Legacy Math",
        grade: "2",
        gradeBand: "2",
        subjectFocus: ["Math"],
        learnerId: "learner-1",
        linkedObjectiveIds: ["math_2_01"],
        defaultDesignPackId: "pack-1",
        artifactIds: ["artifact-1"],
        status: "completed",
        lastActivityDate: "2026-02-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
      },
    ]);
    vi.mocked(getArtifact).mockResolvedValue({
      artifactId: "artifact-1",
      projectId: "remote-project-1",
      jobId: "job-1",
      type: "student_page",
      title: "Worksheet",
      htmlContent: "<p>Worksheet</p>",
      grade: "2",
      subject: "Math",
      objectiveTags: ["math_2_01"],
      objectiveId: "math_2_01",
      designPackId: "pack-1",
      createdAt: "2026-02-01T00:00:00Z",
    });

    const result = await useProjectContextStore
      .getState()
      .migrateLegacyUnifiedProjects([remoteProject]);

    expect(result.migratedProjectIds).toEqual(["remote-project-1"]);
    expect(result.unmappedLegacyProjectIds).toEqual([]);

    const context = useProjectContextStore.getState().getContext("remote-project-1");
    expect(context).toMatchObject({
      projectId: "remote-project-1",
      type: "learning_path",
      learnerId: "learner-1",
      linkedObjectiveIds: ["math_2_01"],
      defaultDesignPackId: "pack-1",
    });
  });

  it("records unmapped legacy projects when they cannot be safely merged", async () => {
    vi.mocked(getLocalProjects).mockResolvedValue([
      {
        projectId: "legacy-2",
        type: "quick_create",
        name: "Unmapped",
        grade: "2",
        gradeBand: "2",
        subjectFocus: ["Math"],
        artifactIds: [],
        status: "pending",
        lastActivityDate: "2026-02-01T00:00:00Z",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-02-01T00:00:00Z",
      },
    ]);

    const result = await useProjectContextStore
      .getState()
      .migrateLegacyUnifiedProjects([remoteProject]);

    expect(result.migratedProjectIds).toEqual([]);
    expect(result.unmappedLegacyProjectIds).toEqual(["legacy-2"]);
    expect(useProjectContextStore.getState().migration.unmappedLegacyProjectIds).toEqual([
      "legacy-2",
    ]);
  });
});
