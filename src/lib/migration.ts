/**
 * Data Migration Utilities (Issue #20)
 *
 * Provides migration functions to convert existing data to the new unified format:
 * - Projects to UnifiedProject
 * - Inspiration items to Design Packs
 * - Project versions to Artifacts
 */

import type {
  Project,
  ProjectVersion,
  InspirationItem,
  UnifiedProject,
  DesignPack,
  LocalArtifact,
  ArtifactType,
  MigrationStatus,
} from "@/types";
import { gradeToGradeBand } from "@/types";

const MIGRATION_KEY = "ta-migration-status";
const CURRENT_MIGRATION_VERSION = 1;

/**
 * Check if migration is needed
 */
export function isMigrationNeeded(): boolean {
  const status = getMigrationStatus();
  return status === null || status.version < CURRENT_MIGRATION_VERSION;
}

/**
 * Get current migration status
 */
export function getMigrationStatus(): MigrationStatus | null {
  const stored = localStorage.getItem(MIGRATION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save migration status
 */
export function saveMigrationStatus(status: MigrationStatus): void {
  localStorage.setItem(MIGRATION_KEY, JSON.stringify(status));
}

/**
 * Map old artifact types to new unified types
 */
export function mapLegacyArtifactType(legacyType: string): ArtifactType {
  switch (legacyType) {
    case "worksheet":
    case "worksheetHtml":
    case "student_activity":
    case "studentActivityHtml":
      return "student_page";
    case "lesson_plan":
    case "lessonPlanHtml":
      return "lesson_plan";
    case "answer_key":
    case "answerKeyHtml":
      return "answer_key";
    case "teacher_script":
    case "teacherScriptHtml":
      return "teacher_script";
    default:
      return "student_page";
  }
}

/**
 * Convert a legacy Project to UnifiedProject
 */
export function migrateProject(project: Project): UnifiedProject {
  const now = new Date().toISOString();

  return {
    projectId: project.id,
    type: "quick_create", // Legacy projects are quick create
    name: project.title,
    description: project.description || undefined,
    grade: project.grade,
    gradeBand: gradeToGradeBand(project.grade),
    subjectFocus: [project.subject],
    artifactIds: [], // Will be populated during artifact migration
    status: project.status,
    lastActivityDate: project.updatedAt?.toISOString() || now,
    createdAt: project.createdAt?.toISOString() || now,
    updatedAt: project.updatedAt?.toISOString() || now,
  };
}

/**
 * Convert a ProjectVersion to LocalArtifacts
 */
export function migrateProjectVersion(
  version: ProjectVersion,
  project: Project
): LocalArtifact[] {
  const artifacts: LocalArtifact[] = [];
  const createdAt = version.createdAt?.toISOString() || new Date().toISOString();

  // Migrate worksheet/student page
  if (version.worksheetHtml) {
    artifacts.push({
      artifactId: `${version.id}-student_page`,
      projectId: version.projectId,
      jobId: version.id,
      type: "student_page",
      title: `${project.title} - Student Page`,
      htmlContent: version.worksheetHtml,
      grade: project.grade,
      subject: project.subject,
      objectiveTags: [], // Legacy projects don't have objective tags
      createdAt,
    });
  }

  // Migrate student activity (if different from worksheet)
  if (version.studentActivityHtml && version.studentActivityHtml !== version.worksheetHtml) {
    artifacts.push({
      artifactId: `${version.id}-student_activity`,
      projectId: version.projectId,
      jobId: version.id,
      type: "student_page",
      title: `${project.title} - Student Activity`,
      htmlContent: version.studentActivityHtml,
      grade: project.grade,
      subject: project.subject,
      objectiveTags: [],
      createdAt,
    });
  }

  // Migrate teacher script
  if (version.teacherScriptHtml) {
    artifacts.push({
      artifactId: `${version.id}-teacher_script`,
      projectId: version.projectId,
      jobId: version.id,
      type: "teacher_script",
      title: `${project.title} - Teacher Script`,
      htmlContent: version.teacherScriptHtml,
      grade: project.grade,
      subject: project.subject,
      objectiveTags: [],
      createdAt,
    });
  }

  // Migrate lesson plan
  if (version.lessonPlanHtml) {
    artifacts.push({
      artifactId: `${version.id}-lesson_plan`,
      projectId: version.projectId,
      jobId: version.id,
      type: "lesson_plan",
      title: `${project.title} - Lesson Plan`,
      htmlContent: version.lessonPlanHtml,
      grade: project.grade,
      subject: project.subject,
      objectiveTags: [],
      createdAt,
    });
  }

  // Migrate answer key
  if (version.answerKeyHtml) {
    artifacts.push({
      artifactId: `${version.id}-answer_key`,
      projectId: version.projectId,
      jobId: version.id,
      type: "answer_key",
      title: `${project.title} - Answer Key`,
      htmlContent: version.answerKeyHtml,
      grade: project.grade,
      subject: project.subject,
      objectiveTags: [],
      createdAt,
    });
  }

  return artifacts;
}

/**
 * Convert legacy InspirationItems to a DesignPack
 */
export function migrateInspirationItems(
  items: InspirationItem[],
  packName: string = "Imported Inspiration"
): DesignPack {
  const now = new Date().toISOString();

  return {
    packId: crypto.randomUUID(),
    name: packName,
    description: "Migrated from legacy design inspiration",
    items: items.map((item) => ({
      itemId: item.id.startsWith("local_") ? crypto.randomUUID() : item.id,
      type: item.type,
      title: item.title,
      sourceUrl: item.sourceUrl,
      content: item.content,
      storagePath: item.storagePath,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Run full migration (call during app initialization if needed)
 */
export async function runMigration(
  legacyProjects: Project[],
  saveProject: (project: UnifiedProject) => Promise<void>,
  saveArtifact: (artifact: LocalArtifact) => Promise<void>,
  saveDesignPack: (pack: DesignPack) => Promise<void>
): Promise<MigrationStatus> {
  const status: MigrationStatus = {
    version: CURRENT_MIGRATION_VERSION,
    lastMigrated: new Date().toISOString(),
    migratedEntities: {
      projects: 0,
      inspiration: 0,
      artifacts: 0,
    },
  };

  // Migrate each project
  for (const project of legacyProjects) {
    try {
      // Convert project
      const unifiedProject = migrateProject(project);

      // Convert inspiration items to design pack if any
      if (project.inspiration && project.inspiration.length > 0) {
        const pack = migrateInspirationItems(
          project.inspiration,
          `${project.title} Inspiration`
        );
        await saveDesignPack(pack);
        unifiedProject.defaultDesignPackId = pack.packId;
        status.migratedEntities.inspiration += project.inspiration.length;
      }

      // Convert latest version to artifacts
      if (project.latestVersion) {
        const artifacts = migrateProjectVersion(project.latestVersion, project);
        for (const artifact of artifacts) {
          await saveArtifact(artifact);
          unifiedProject.artifactIds.push(artifact.artifactId);
          status.migratedEntities.artifacts++;
        }
      }

      // Save the unified project
      await saveProject(unifiedProject);
      status.migratedEntities.projects++;
    } catch (error) {
      console.error(`Failed to migrate project ${project.id}:`, error);
    }
  }

  // Save migration status
  saveMigrationStatus(status);

  return status;
}

/**
 * Extract objective tags from content (basic heuristic)
 * This is a fallback for content without explicit objective tags
 */
export function inferObjectiveTags(
  content: string,
  grade: string,
  subject: string
): string[] {
  const tags: string[] = [];

  // Common patterns to detect
  const patterns: Record<string, Record<string, RegExp[]>> = {
    MATH: {
      COUNT: [/count/i, /number.*1.*20/i, /counting/i],
      ADD: [/add/i, /addition/i, /sum/i, /plus/i],
      SUB: [/subtract/i, /minus/i, /take away/i],
      MULT: [/multiply/i, /times/i, /multiplication/i],
      DIV: [/divide/i, /division/i],
      SHAPES: [/shape/i, /circle/i, /square/i, /triangle/i],
      MEASURE: [/measure/i, /length/i, /weight/i, /time/i],
    },
    READING: {
      PHONICS: [/phonics/i, /sound/i, /letter.*sound/i],
      CVC: [/cvc/i, /consonant.*vowel/i],
      SIGHT: [/sight word/i],
      COMPREH: [/comprehension/i, /main idea/i, /character/i],
      FLUENCY: [/fluency/i, /read.*aloud/i],
    },
    WRITING: {
      SENTENCE: [/sentence/i, /capital/i, /period/i],
      PARAGRAPH: [/paragraph/i],
      STORY: [/story/i, /narrative/i],
    },
    SCIENCE: {
      LIFE: [/plant/i, /animal/i, /living/i],
      EARTH: [/weather/i, /season/i, /rock/i],
      PHYSICAL: [/magnet/i, /force/i, /matter/i],
    },
  };

  const subjectKey = subject.toUpperCase().replace(/\s+/g, "_");
  const subjectPatterns = patterns[subjectKey];

  if (subjectPatterns) {
    for (const [domain, domainPatterns] of Object.entries(subjectPatterns)) {
      for (const pattern of domainPatterns) {
        if (pattern.test(content)) {
          tags.push(`${grade}.${subjectKey}.${domain}`);
          break; // Only add one tag per domain
        }
      }
    }
  }

  return tags;
}
