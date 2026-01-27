import type { Grade, ProjectStatus } from "./database";
import type { MasteryState } from "./learner";

// ============================================
// Project Unification Types (Issue #20)
// ============================================

/**
 * Project type - distinguishes learning path from quick create workflows
 */
export type ProjectType = "learning_path" | "quick_create";

/**
 * Grade band for projects (MVP focuses on K-3)
 */
export type GradeBand = "K" | "1" | "2" | "3" | "4-6";

/**
 * Artifact types representing different output documents
 */
export type ArtifactType =
  | "student_page"      // Main student worksheet/activity
  | "teacher_script"    // Teacher instructions/guide
  | "answer_key"        // Answer key for assessment
  | "lesson_plan"       // Full lesson plan
  | "print_pack";       // Combined print-ready bundle

// ============================================
// Objective Tagging Types
// ============================================

/**
 * Standard identifier for a learning objective
 * Format: GRADE.SUBJECT.DOMAIN.SPECIFIC
 * Examples: K.MATH.COUNT.1_20, 2.READING.COMPREH.MAIN_IDEA
 */
export interface ObjectiveTag {
  id: string;           // Full objective ID (e.g., "K.MATH.COUNT.1_20")
  standard: string;     // Standard/domain (e.g., "K.MATH.COUNT")
  description: string;  // Human-readable description
  grade: Grade;
  subject: string;
}

/**
 * Helper to parse an objective ID into components
 */
export function parseObjectiveId(id: string): { grade: string; subject: string; domain: string; specific: string } | null {
  const parts = id.split(".");
  if (parts.length < 3) return null;
  return {
    grade: parts[0],
    subject: parts[1],
    domain: parts[2],
    specific: parts.slice(3).join("."),
  };
}

// ============================================
// Design Pack Types (formerly Design Inspiration)
// ============================================

/**
 * Individual item within a design pack
 */
export interface DesignPackItem {
  itemId: string;
  type: "url" | "pdf" | "image" | "text";
  title: string;
  sourceUrl?: string;     // For URLs
  content?: string;       // For PDFs/images (base64) or text
  storagePath?: string;   // Media type for vision API
}

/**
 * Parsed design summary from inspiration items
 */
export interface ParsedDesignSummary {
  palette?: string[];     // Color codes extracted
  tone?: string;          // Friendly, formal, playful, etc.
  typography?: string;    // Font style hints
  styleHints?: string[];  // Additional style notes
}

/**
 * Design Pack - a named bundle of design inspiration items
 */
export interface DesignPack {
  packId: string;
  name: string;
  description?: string;
  items: DesignPackItem[];
  parsedSummary?: ParsedDesignSummary;
  createdAt: string;  // ISO string
  updatedAt: string;
}

/**
 * Data for creating a new design pack
 */
export interface CreateDesignPackData {
  name: string;
  description?: string;
  items?: DesignPackItem[];
}

// ============================================
// Local Artifact Types (Library Items)
// ============================================

/**
 * A stored output artifact from generation
 */
export interface LocalArtifact {
  artifactId: string;
  projectId: string;
  jobId: string;            // Generation job ID (version ID)
  type: ArtifactType;
  title: string;
  htmlContent: string;
  grade: Grade;
  subject: string;
  objectiveTags: string[];  // Array of objective IDs
  designPackId?: string;    // If generated with a design pack
  filePath?: string;        // Local file path if saved
  createdAt: string;        // ISO string
}

/**
 * Search/filter query for artifacts
 */
export interface ArtifactSearchQuery {
  projectId?: string;
  grade?: Grade;
  subject?: string;
  type?: ArtifactType;
  objectiveTag?: string;    // Filter by specific objective
  designPackId?: string;
  searchText?: string;      // Full-text search in title
  dateFrom?: string;        // ISO string
  dateTo?: string;
}

/**
 * Artifact with related project info (for library display)
 */
export interface ArtifactWithProject extends LocalArtifact {
  projectTitle: string;
  projectType: ProjectType;
}

// ============================================
// Unified Project Types
// ============================================

/**
 * Unified project model supporting both learning path and quick create
 */
export interface UnifiedProject {
  projectId: string;
  type: ProjectType;
  name: string;
  description?: string;

  // Content focus
  grade: Grade;
  gradeBand: GradeBand;
  subjectFocus: string[];   // Primary subjects

  // Learning path specific (optional)
  learnerId?: string;       // Associated learner profile
  linkedObjectiveIds?: string[];  // Curriculum objectives being worked on

  // Design settings
  defaultDesignPackId?: string;

  // Artifact tracking
  artifactIds: string[];    // Generated artifacts belonging to this project

  // Status
  status: ProjectStatus;
  lastActivityDate: string; // ISO string

  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Data for creating a new unified project
 */
export interface CreateUnifiedProjectData {
  type: ProjectType;
  name: string;
  description?: string;
  grade: Grade;
  subjectFocus?: string[];
  learnerId?: string;
  linkedObjectiveIds?: string[];
  defaultDesignPackId?: string;
}

/**
 * Summary data for project cards
 */
export interface ProjectSummary {
  projectId: string;
  type: ProjectType;
  name: string;
  grade: Grade;
  subjectFocus: string[];
  lastActivityDate: string;
  artifactCount: number;
  // Learning path specific
  learnerId?: string;
  learnerName?: string;
  masteryProgress?: {
    total: number;
    mastered: number;
    inProgress: number;
  };
}

// ============================================
// Mastery Integration Types
// ============================================

/**
 * Extended mastery record linking artifacts as evidence
 */
export interface MasteryRecordWithEvidence {
  projectId: string;
  learnerId: string;
  objectiveId: string;
  status: MasteryState;
  lastUpdatedAt: string;
  evidenceArtifactIds: string[];  // Artifacts demonstrating mastery
}

/**
 * Today's plan item for Learning Path projects
 */
export interface TodaysPlanItem {
  objectiveId: string;
  objectiveText: string;
  subject: string;
  estimatedMinutes: number;
  status: "pending" | "in_progress" | "completed";
  linkedArtifactIds: string[];
}

/**
 * Today's plan for a learning path project
 */
export interface TodaysPlan {
  projectId: string;
  date: string;  // ISO date string (YYYY-MM-DD)
  items: TodaysPlanItem[];
  totalMinutes: number;
}

// ============================================
// Library Index Types
// ============================================

/**
 * Library index stored locally (append-only with periodic compaction)
 */
export interface LibraryIndex {
  version: number;
  lastUpdated: string;
  artifacts: LocalArtifact[];
}

/**
 * Library filter state for UI
 */
export interface LibraryFilters {
  projects: string[];       // Project IDs
  grades: Grade[];
  subjects: string[];
  types: ArtifactType[];
  objectiveTags: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

/**
 * Library view mode
 */
export type LibraryViewMode = "grid" | "list";

/**
 * Library sort options
 */
export type LibrarySortBy = "date_desc" | "date_asc" | "title_asc" | "title_desc" | "grade";

// ============================================
// Preview Tab Types
// ============================================

/**
 * Standard preview tabs (Issue #20 requirement)
 */
export type PreviewTabId =
  | "student_page"
  | "teacher_script"
  | "answer_key"
  | "lesson_plan"
  | "print_pack";

/**
 * Preview tab configuration
 */
export interface PreviewTabConfig {
  id: PreviewTabId;
  label: string;
  icon: string;  // Lucide icon name
  available: boolean;
  content?: string;  // HTML content
}

// ============================================
// Migration Types
// ============================================

/**
 * Migration status for tracking data upgrades
 */
export interface MigrationStatus {
  version: number;
  lastMigrated: string;
  migratedEntities: {
    projects: number;
    inspiration: number;
    artifacts: number;
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Convert grade to grade band
 */
export function gradeToGradeBand(grade: Grade): GradeBand {
  if (grade === "K" || grade === "1" || grade === "2" || grade === "3") {
    return grade;
  }
  return "4-6";
}

/**
 * Map old artifact types to new unified types
 */
export function mapLegacyArtifactType(legacyType: string): ArtifactType {
  switch (legacyType) {
    case "worksheet":
    case "student_activity":
      return "student_page";
    case "lesson_plan":
      return "lesson_plan";
    case "answer_key":
      return "answer_key";
    case "teacher_script":
      return "teacher_script";
    default:
      return "student_page";
  }
}

/**
 * Get display label for artifact type
 */
export function getArtifactTypeLabel(type: ArtifactType): string {
  switch (type) {
    case "student_page":
      return "Student Page";
    case "teacher_script":
      return "Teacher Script";
    case "answer_key":
      return "Answer Key";
    case "lesson_plan":
      return "Lesson Plan";
    case "print_pack":
      return "Print Pack";
  }
}

/**
 * Get display label for project type
 */
export function getProjectTypeLabel(type: ProjectType): string {
  switch (type) {
    case "learning_path":
      return "Learning Path";
    case "quick_create":
      return "Quick Create";
  }
}
