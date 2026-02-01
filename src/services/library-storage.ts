import { invoke } from "@tauri-apps/api/core";
import { isTauriContext } from "./tauri-bridge";
import type {
  LocalArtifact,
  ArtifactSearchQuery,
  LibraryIndex,
} from "@/types";

// ============================================
// Library Index Functions
// ============================================

/**
 * Get the library index (metadata for all artifacts)
 */
export async function getLibraryIndex(): Promise<LibraryIndex> {
  if (!isTauriContext()) {
    // Browser fallback - use localStorage
    const stored = localStorage.getItem("library-index");
    if (stored) return JSON.parse(stored);
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      artifacts: [],
    };
  }

  const result = await invoke<string>("get_library_index");
  return JSON.parse(result);
}

/**
 * Save the library index
 */
export async function saveLibraryIndex(index: LibraryIndex): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    localStorage.setItem("library-index", JSON.stringify(index));
    return;
  }

  await invoke("save_library_index", {
    index: JSON.stringify(index),
  });
}

// ============================================
// Artifact Functions
// ============================================

/**
 * Get all artifacts (from index, without HTML content)
 */
export async function getArtifacts(): Promise<Omit<LocalArtifact, "htmlContent">[]> {
  const index = await getLibraryIndex();
  return index.artifacts;
}

/**
 * Get artifacts filtered by project ID
 */
export async function getArtifactsByProject(projectId: string): Promise<Omit<LocalArtifact, "htmlContent">[]> {
  const index = await getLibraryIndex();
  return index.artifacts.filter((a) => a.projectId === projectId);
}

/**
 * Get a specific artifact by ID (includes HTML content)
 */
export async function getArtifact(artifactId: string): Promise<LocalArtifact | null> {
  if (!isTauriContext()) {
    // Browser fallback - store full artifacts in localStorage
    const stored = localStorage.getItem(`artifact-${artifactId}`);
    if (stored) return JSON.parse(stored);
    return null;
  }

  try {
    const result = await invoke<string>("get_artifact", { artifactId });
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Save an artifact
 */
export async function saveArtifact(artifact: LocalArtifact): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    // Save full artifact separately
    localStorage.setItem(`artifact-${artifact.artifactId}`, JSON.stringify(artifact));

    // Update index (without HTML content)
    const index = await getLibraryIndex();
    const indexEntry: Omit<LocalArtifact, "htmlContent"> = {
      artifactId: artifact.artifactId,
      projectId: artifact.projectId,
      jobId: artifact.jobId,
      type: artifact.type,
      title: artifact.title,
      grade: artifact.grade,
      subject: artifact.subject,
      objectiveTags: artifact.objectiveTags,
      designPackId: artifact.designPackId,
      filePath: artifact.filePath,
      createdAt: artifact.createdAt,
    };

    // Remove existing entry with same ID
    index.artifacts = index.artifacts.filter((a) => a.artifactId !== artifact.artifactId);
    index.artifacts.push(indexEntry as LocalArtifact);
    index.lastUpdated = new Date().toISOString();

    await saveLibraryIndex(index);
    return;
  }

  await invoke("save_artifact", {
    artifact: JSON.stringify(artifact),
  });
}

/**
 * Delete an artifact
 */
export async function deleteArtifact(artifactId: string): Promise<void> {
  if (!isTauriContext()) {
    // Browser fallback
    localStorage.removeItem(`artifact-${artifactId}`);

    // Update index
    const index = await getLibraryIndex();
    index.artifacts = index.artifacts.filter((a) => a.artifactId !== artifactId);
    index.lastUpdated = new Date().toISOString();
    await saveLibraryIndex(index);
    return;
  }

  await invoke("delete_artifact", { artifactId });
}

/**
 * Search artifacts with filters
 */
export async function searchArtifacts(query: ArtifactSearchQuery): Promise<Omit<LocalArtifact, "htmlContent">[]> {
  if (!isTauriContext()) {
    // Browser fallback - filter locally
    const index = await getLibraryIndex();
    let results = index.artifacts;

    if (query.projectId) {
      results = results.filter((a) => a.projectId === query.projectId);
    }
    if (query.grade) {
      results = results.filter((a) => a.grade === query.grade);
    }
    if (query.subject) {
      results = results.filter((a) => a.subject === query.subject);
    }
    if (query.type) {
      results = results.filter((a) => a.type === query.type);
    }
    if (query.objectiveTag) {
      results = results.filter((a) => a.objectiveTags.includes(query.objectiveTag!));
    }
    if (query.designPackId) {
      results = results.filter((a) => a.designPackId === query.designPackId);
    }
    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      results = results.filter((a) => a.title.toLowerCase().includes(searchLower));
    }

    return results;
  }

  const result = await invoke<string>("search_artifacts", {
    query: JSON.stringify(query),
  });
  return JSON.parse(result);
}

/**
 * Update the objective tags on an artifact
 */
export async function updateArtifactTags(artifactId: string, tags: string[]): Promise<void> {
  // Update the full artifact
  const artifact = await getArtifact(artifactId);
  if (!artifact) throw new Error(`Artifact ${artifactId} not found`);

  artifact.objectiveTags = tags;
  await saveArtifact(artifact);
}

/**
 * Get all artifacts from the same generation job
 */
export async function getArtifactsByJob(jobId: string): Promise<LocalArtifact[]> {
  const index = await getLibraryIndex();
  const jobArtifacts = index.artifacts.filter((a) => a.jobId === jobId);

  // Load full content for each artifact
  const fullArtifacts: LocalArtifact[] = [];
  for (const meta of jobArtifacts) {
    const full = await getArtifact(meta.artifactId);
    if (full) fullArtifacts.push(full);
  }
  return fullArtifacts;
}

/**
 * Create multiple artifacts from a generation result
 */
export async function saveArtifactsFromGeneration(
  projectId: string,
  jobId: string,
  grade: string,
  subject: string,
  title: string,
  objectiveTags: string[],
  designPackId: string | undefined,
  contents: {
    studentPage?: string;
    teacherScript?: string;
    answerKey?: string;
    lessonPlan?: string;
  }
): Promise<LocalArtifact[]> {
  const now = new Date().toISOString();
  const artifacts: LocalArtifact[] = [];

  if (contents.studentPage) {
    const artifact: LocalArtifact = {
      artifactId: crypto.randomUUID(),
      projectId,
      jobId,
      type: "student_page",
      title: `${title} - Student Page`,
      htmlContent: contents.studentPage,
      grade: grade as LocalArtifact["grade"],
      subject,
      objectiveTags,
      designPackId,
      createdAt: now,
    };
    await saveArtifact(artifact);
    artifacts.push(artifact);
  }

  if (contents.teacherScript) {
    const artifact: LocalArtifact = {
      artifactId: crypto.randomUUID(),
      projectId,
      jobId,
      type: "teacher_script",
      title: `${title} - Teacher Script`,
      htmlContent: contents.teacherScript,
      grade: grade as LocalArtifact["grade"],
      subject,
      objectiveTags,
      designPackId,
      createdAt: now,
    };
    await saveArtifact(artifact);
    artifacts.push(artifact);
  }

  if (contents.answerKey) {
    const artifact: LocalArtifact = {
      artifactId: crypto.randomUUID(),
      projectId,
      jobId,
      type: "answer_key",
      title: `${title} - Answer Key`,
      htmlContent: contents.answerKey,
      grade: grade as LocalArtifact["grade"],
      subject,
      objectiveTags,
      designPackId,
      createdAt: now,
    };
    await saveArtifact(artifact);
    artifacts.push(artifact);
  }

  if (contents.lessonPlan) {
    const artifact: LocalArtifact = {
      artifactId: crypto.randomUUID(),
      projectId,
      jobId,
      type: "lesson_plan",
      title: `${title} - Lesson Plan`,
      htmlContent: contents.lessonPlan,
      grade: grade as LocalArtifact["grade"],
      subject,
      objectiveTags,
      designPackId,
      createdAt: now,
    };
    await saveArtifact(artifact);
    artifacts.push(artifact);
  }

  return artifacts;
}
