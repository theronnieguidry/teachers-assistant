/**
 * Curriculum API Routes
 *
 * Provides endpoints for querying curriculum packs and getting
 * objective recommendations for the "Help me choose" feature.
 */

import { Router, Request, Response } from "express";
import {
  getRecommendedObjectives,
  getAvailableSubjects,
  getAvailableGrades,
  hasSubjectPack,
  getObjectiveById,
  searchObjectives,
  getUnitsForGrade,
} from "../services/premium/curriculum-pack";

const router = Router();

/**
 * GET /curriculum/subjects
 *
 * Returns list of subjects with curriculum packs available
 */
router.get("/subjects", (_req: Request, res: Response) => {
  const subjects = getAvailableSubjects();
  res.json({ subjects });
});

/**
 * GET /curriculum/grades
 *
 * Returns list of grades covered by curriculum packs
 */
router.get("/grades", (_req: Request, res: Response) => {
  const grades = getAvailableGrades();
  res.json({ grades });
});

/**
 * GET /curriculum/objectives
 *
 * Returns recommended learning objectives for a grade and subject.
 * Used by the "Help me choose" feature in the wizard.
 *
 * Query params:
 *   - grade (required): Grade level (K, 1, 2, 3)
 *   - subject (required): Subject name (Math, Reading, etc.)
 *   - difficulty (optional): Filter by difficulty (easy, standard, challenge)
 *   - count (optional): Number of recommendations (default: 3, max: 10)
 */
router.get("/objectives", (req: Request, res: Response) => {
  const { grade, subject, difficulty, count } = req.query;

  // Validate required params
  if (!grade || typeof grade !== "string") {
    return res.status(400).json({
      error: "grade is required",
      details: "Provide a grade level (K, 1, 2, or 3)",
    });
  }

  if (!subject || typeof subject !== "string") {
    return res.status(400).json({
      error: "subject is required",
      details: "Provide a subject (Math, Reading, Writing, Science, or Social Studies)",
    });
  }

  // Check if subject has a curriculum pack
  if (!hasSubjectPack(subject)) {
    return res.status(404).json({
      error: "No curriculum pack available for this subject",
      availableSubjects: getAvailableSubjects(),
    });
  }

  // Validate difficulty if provided
  const validDifficulties = ["easy", "standard", "challenge"];
  if (
    difficulty &&
    typeof difficulty === "string" &&
    !validDifficulties.includes(difficulty)
  ) {
    return res.status(400).json({
      error: "Invalid difficulty",
      validValues: validDifficulties,
    });
  }

  // Parse and validate count
  let objectiveCount = 3;
  if (count) {
    const parsed = parseInt(count as string, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 10) {
      return res.status(400).json({
        error: "count must be between 1 and 10",
      });
    }
    objectiveCount = parsed;
  }

  // Get recommendations
  const objectives = getRecommendedObjectives(
    grade,
    subject,
    difficulty as "easy" | "standard" | "challenge" | undefined,
    objectiveCount
  );

  if (objectives.length === 0) {
    return res.json({
      objectives: [],
      message: "No objectives found for this grade and subject combination",
    });
  }

  res.json({
    objectives,
    grade,
    subject,
    count: objectives.length,
  });
});

/**
 * GET /curriculum/objectives/:id
 *
 * Returns a specific objective by ID
 *
 * Query params:
 *   - subject (required): Subject name to search in
 */
router.get("/objectives/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { subject } = req.query;

  if (!subject || typeof subject !== "string") {
    return res.status(400).json({
      error: "subject query parameter is required",
    });
  }

  const objective = getObjectiveById(subject, id);

  if (!objective) {
    return res.status(404).json({
      error: "Objective not found",
    });
  }

  res.json({ objective });
});

/**
 * GET /curriculum/units
 *
 * Returns curriculum units for a grade and subject
 *
 * Query params:
 *   - grade (required): Grade level
 *   - subject (required): Subject name
 */
router.get("/units", (req: Request, res: Response) => {
  const { grade, subject } = req.query;

  if (!grade || typeof grade !== "string") {
    return res.status(400).json({ error: "grade is required" });
  }

  if (!subject || typeof subject !== "string") {
    return res.status(400).json({ error: "subject is required" });
  }

  if (!hasSubjectPack(subject)) {
    return res.status(404).json({
      error: "No curriculum pack available for this subject",
      availableSubjects: getAvailableSubjects(),
    });
  }

  const units = getUnitsForGrade(subject, grade);

  res.json({
    units: units.map((unit) => ({
      unitId: unit.unitId,
      title: unit.title,
      grade: unit.grade,
      sequence: unit.sequence,
      objectiveCount: unit.objectives.length,
    })),
    grade,
    subject,
  });
});

/**
 * GET /curriculum/search
 *
 * Search objectives by keyword
 *
 * Query params:
 *   - q (required): Search keyword
 *   - subject (required): Subject to search in
 *   - grade (optional): Filter by grade
 */
router.get("/search", (req: Request, res: Response) => {
  const { q, subject, grade } = req.query;

  if (!q || typeof q !== "string" || q.length < 2) {
    return res.status(400).json({
      error: "Search query (q) is required and must be at least 2 characters",
    });
  }

  if (!subject || typeof subject !== "string") {
    return res.status(400).json({ error: "subject is required" });
  }

  if (!hasSubjectPack(subject)) {
    return res.status(404).json({
      error: "No curriculum pack available for this subject",
      availableSubjects: getAvailableSubjects(),
    });
  }

  const results = searchObjectives(
    subject,
    q,
    typeof grade === "string" ? grade : undefined
  );

  res.json({
    results,
    query: q,
    subject,
    grade: grade || null,
    count: results.length,
  });
});

export default router;
