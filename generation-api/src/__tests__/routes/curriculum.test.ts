import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import curriculumRouter from "../../routes/curriculum.js";
import * as curriculumPack from "../../services/premium/curriculum-pack.js";

// Mock the curriculum-pack service
vi.mock("../../services/premium/curriculum-pack.js", () => ({
  getAvailableSubjects: vi.fn(),
  getAvailableGrades: vi.fn(),
  hasSubjectPack: vi.fn(),
  getRecommendedObjectives: vi.fn(),
  getObjectiveById: vi.fn(),
  getUnitsForGrade: vi.fn(),
  searchObjectives: vi.fn(),
}));

describe("Curriculum Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use("/curriculum", curriculumRouter);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET /curriculum/subjects", () => {
    it("should return list of available subjects", async () => {
      vi.mocked(curriculumPack.getAvailableSubjects).mockReturnValue([
        "Math",
        "Reading",
        "Writing",
        "Science",
        "Social Studies",
      ]);

      const response = await request(app).get("/curriculum/subjects");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("subjects");
      expect(response.body.subjects).toEqual([
        "Math",
        "Reading",
        "Writing",
        "Science",
        "Social Studies",
      ]);
    });

    it("should return 200 with JSON response", async () => {
      vi.mocked(curriculumPack.getAvailableSubjects).mockReturnValue(["Math"]);

      const response = await request(app).get("/curriculum/subjects");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/json/);
    });

    it("should return empty array if no packs available", async () => {
      vi.mocked(curriculumPack.getAvailableSubjects).mockReturnValue([]);

      const response = await request(app).get("/curriculum/subjects");

      expect(response.status).toBe(200);
      expect(response.body.subjects).toEqual([]);
    });
  });

  describe("GET /curriculum/grades", () => {
    it("should return list of available grades", async () => {
      vi.mocked(curriculumPack.getAvailableGrades).mockReturnValue([
        "K",
        "1",
        "2",
        "3",
      ]);

      const response = await request(app).get("/curriculum/grades");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("grades");
      expect(response.body.grades).toEqual(["K", "1", "2", "3"]);
    });

    it("should return 200 with JSON response", async () => {
      vi.mocked(curriculumPack.getAvailableGrades).mockReturnValue(["K"]);

      const response = await request(app).get("/curriculum/grades");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/json/);
    });

    it("should return empty array if no grades available", async () => {
      vi.mocked(curriculumPack.getAvailableGrades).mockReturnValue([]);

      const response = await request(app).get("/curriculum/grades");

      expect(response.status).toBe(200);
      expect(response.body.grades).toEqual([]);
    });
  });

  describe("GET /curriculum/objectives", () => {
    const mockObjectives = [
      {
        id: "math-k-1",
        text: "Count to 10",
        difficulty: "easy",
        estimatedMinutes: 15,
        unitTitle: "Numbers 0-10",
        whyRecommended: "Foundation skill",
        vocabulary: ["count", "number"],
        activities: ["Counting objects"],
        misconceptions: [],
      },
    ];

    it("should return 400 if grade is missing", async () => {
      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ subject: "Math" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("grade is required");
      expect(response.body.details).toBeDefined();
    });

    it("should return 400 if subject is missing", async () => {
      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("subject is required");
      expect(response.body.details).toBeDefined();
    });

    it("should return 404 if subject has no curriculum pack", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(false);
      vi.mocked(curriculumPack.getAvailableSubjects).mockReturnValue([
        "Math",
        "Reading",
      ]);

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K", subject: "Art" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(
        "No curriculum pack available for this subject"
      );
      expect(response.body.availableSubjects).toEqual(["Math", "Reading"]);
    });

    it("should return 400 if difficulty is invalid", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K", subject: "Math", difficulty: "impossible" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid difficulty");
      expect(response.body.validValues).toEqual([
        "easy",
        "standard",
        "challenge",
      ]);
    });

    it("should return 400 if count is less than 1", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K", subject: "Math", count: "0" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("count must be between 1 and 10");
    });

    it("should return 400 if count is greater than 10", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K", subject: "Math", count: "15" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("count must be between 1 and 10");
    });

    it("should return 400 if count is not a number", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K", subject: "Math", count: "abc" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("count must be between 1 and 10");
    });

    it("should return objectives with default count (3)", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.getRecommendedObjectives).mockReturnValue(
        mockObjectives
      );

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K", subject: "Math" });

      expect(response.status).toBe(200);
      expect(curriculumPack.getRecommendedObjectives).toHaveBeenCalledWith(
        "K",
        "Math",
        undefined,
        3
      );
      expect(response.body).toHaveProperty("objectives");
      expect(response.body.grade).toBe("K");
      expect(response.body.subject).toBe("Math");
    });

    it("should return objectives with custom count", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.getRecommendedObjectives).mockReturnValue(
        mockObjectives
      );

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "1", subject: "Reading", count: "5" });

      expect(response.status).toBe(200);
      expect(curriculumPack.getRecommendedObjectives).toHaveBeenCalledWith(
        "1",
        "Reading",
        undefined,
        5
      );
    });

    it("should return objectives filtered by difficulty", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.getRecommendedObjectives).mockReturnValue(
        mockObjectives
      );

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "2", subject: "Math", difficulty: "easy" });

      expect(response.status).toBe(200);
      expect(curriculumPack.getRecommendedObjectives).toHaveBeenCalledWith(
        "2",
        "Math",
        "easy",
        3
      );
    });

    it("should return empty array with message if no objectives found", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.getRecommendedObjectives).mockReturnValue([]);

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K", subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body.objectives).toEqual([]);
      expect(response.body.message).toBe(
        "No objectives found for this grade and subject combination"
      );
    });

    it("should return correct response shape", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.getRecommendedObjectives).mockReturnValue(
        mockObjectives
      );

      const response = await request(app)
        .get("/curriculum/objectives")
        .query({ grade: "K", subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("objectives");
      expect(response.body).toHaveProperty("grade");
      expect(response.body).toHaveProperty("subject");
      expect(response.body).toHaveProperty("count");
      expect(response.body.count).toBe(mockObjectives.length);
    });
  });

  describe("GET /curriculum/objectives/:id", () => {
    const mockObjective = {
      id: "math-k-1",
      text: "Count to 10",
      difficulty: "easy",
      estimatedMinutes: 15,
      unitTitle: "Numbers 0-10",
      vocabulary: ["count", "number"],
      activities: ["Counting objects"],
      prereqs: [],
      misconceptions: [],
    };

    it("should return 400 if subject query param is missing", async () => {
      const response = await request(app).get("/curriculum/objectives/math-k-1");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("subject query parameter is required");
    });

    it("should return 404 if objective not found", async () => {
      vi.mocked(curriculumPack.getObjectiveById).mockReturnValue(null);

      const response = await request(app)
        .get("/curriculum/objectives/nonexistent")
        .query({ subject: "Math" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Objective not found");
    });

    it("should return objective when found", async () => {
      vi.mocked(curriculumPack.getObjectiveById).mockReturnValue(mockObjective);

      const response = await request(app)
        .get("/curriculum/objectives/math-k-1")
        .query({ subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("objective");
      expect(response.body.objective).toEqual(mockObjective);
    });

    it("should call getObjectiveById with correct params", async () => {
      vi.mocked(curriculumPack.getObjectiveById).mockReturnValue(mockObjective);

      await request(app)
        .get("/curriculum/objectives/reading-1-5")
        .query({ subject: "Reading" });

      expect(curriculumPack.getObjectiveById).toHaveBeenCalledWith(
        "Reading",
        "reading-1-5"
      );
    });

    it("should return correct response shape", async () => {
      vi.mocked(curriculumPack.getObjectiveById).mockReturnValue(mockObjective);

      const response = await request(app)
        .get("/curriculum/objectives/math-k-1")
        .query({ subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("objective");
      expect(response.body.objective).toHaveProperty("id");
      expect(response.body.objective).toHaveProperty("text");
      expect(response.body.objective).toHaveProperty("difficulty");
      expect(response.body.objective).toHaveProperty("unitTitle");
    });
  });

  describe("GET /curriculum/units", () => {
    const mockUnits = [
      {
        unitId: "math-k-u1",
        title: "Numbers 0-10",
        grade: "K",
        sequence: 1,
        objectives: [
          { id: "obj1", text: "Count to 5" },
          { id: "obj2", text: "Count to 10" },
        ],
      },
      {
        unitId: "math-k-u2",
        title: "Shapes",
        grade: "K",
        sequence: 2,
        objectives: [{ id: "obj3", text: "Identify circles" }],
      },
    ];

    it("should return 400 if grade is missing", async () => {
      const response = await request(app)
        .get("/curriculum/units")
        .query({ subject: "Math" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("grade is required");
    });

    it("should return 400 if subject is missing", async () => {
      const response = await request(app)
        .get("/curriculum/units")
        .query({ grade: "K" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("subject is required");
    });

    it("should return 404 if no curriculum pack for subject", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(false);
      vi.mocked(curriculumPack.getAvailableSubjects).mockReturnValue([
        "Math",
        "Reading",
      ]);

      const response = await request(app)
        .get("/curriculum/units")
        .query({ grade: "K", subject: "Music" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(
        "No curriculum pack available for this subject"
      );
      expect(response.body.availableSubjects).toEqual(["Math", "Reading"]);
    });

    it("should return units with correct shape", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.getUnitsForGrade).mockReturnValue(mockUnits);

      const response = await request(app)
        .get("/curriculum/units")
        .query({ grade: "K", subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("units");
      expect(response.body).toHaveProperty("grade", "K");
      expect(response.body).toHaveProperty("subject", "Math");

      // Check unit shape (without objectives array, but with objectiveCount)
      expect(response.body.units[0]).toHaveProperty("unitId", "math-k-u1");
      expect(response.body.units[0]).toHaveProperty("title", "Numbers 0-10");
      expect(response.body.units[0]).toHaveProperty("grade", "K");
      expect(response.body.units[0]).toHaveProperty("sequence", 1);
      expect(response.body.units[0]).toHaveProperty("objectiveCount", 2);
      expect(response.body.units[0]).not.toHaveProperty("objectives");
    });

    it("should return empty array if no units for grade", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.getUnitsForGrade).mockReturnValue([]);

      const response = await request(app)
        .get("/curriculum/units")
        .query({ grade: "6", subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body.units).toEqual([]);
    });

    it("should call getUnitsForGrade with correct params", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.getUnitsForGrade).mockReturnValue(mockUnits);

      await request(app)
        .get("/curriculum/units")
        .query({ grade: "2", subject: "Reading" });

      expect(curriculumPack.getUnitsForGrade).toHaveBeenCalledWith(
        "Reading",
        "2"
      );
    });
  });

  describe("GET /curriculum/search", () => {
    const mockResults = [
      {
        id: "math-k-1",
        text: "Count to 10",
        difficulty: "easy",
        estimatedMinutes: 15,
        unitTitle: "Numbers 0-10",
        whyRecommended: "Foundation skill",
        vocabulary: ["count"],
        activities: ["Counting"],
        misconceptions: [],
      },
    ];

    it("should return 400 if query is missing", async () => {
      const response = await request(app)
        .get("/curriculum/search")
        .query({ subject: "Math" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "Search query (q) is required and must be at least 2 characters"
      );
    });

    it("should return 400 if query is too short", async () => {
      const response = await request(app)
        .get("/curriculum/search")
        .query({ q: "a", subject: "Math" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "Search query (q) is required and must be at least 2 characters"
      );
    });

    it("should return 400 if subject is missing", async () => {
      const response = await request(app)
        .get("/curriculum/search")
        .query({ q: "count" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("subject is required");
    });

    it("should return 404 if no curriculum pack for subject", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(false);
      vi.mocked(curriculumPack.getAvailableSubjects).mockReturnValue([
        "Math",
        "Reading",
      ]);

      const response = await request(app)
        .get("/curriculum/search")
        .query({ q: "count", subject: "Art" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe(
        "No curriculum pack available for this subject"
      );
    });

    it("should return search results", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.searchObjectives).mockReturnValue(mockResults);

      const response = await request(app)
        .get("/curriculum/search")
        .query({ q: "count", subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("results");
      expect(response.body.results).toEqual(mockResults);
      expect(response.body).toHaveProperty("query", "count");
      expect(response.body).toHaveProperty("subject", "Math");
      expect(response.body).toHaveProperty("count", 1);
    });

    it("should return empty array if no results", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.searchObjectives).mockReturnValue([]);

      const response = await request(app)
        .get("/curriculum/search")
        .query({ q: "nonexistent", subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body.results).toEqual([]);
      expect(response.body.count).toBe(0);
    });

    it("should filter by grade when provided", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.searchObjectives).mockReturnValue(mockResults);

      await request(app)
        .get("/curriculum/search")
        .query({ q: "count", subject: "Math", grade: "K" });

      expect(curriculumPack.searchObjectives).toHaveBeenCalledWith(
        "Math",
        "count",
        "K"
      );
    });

    it("should pass undefined grade when not provided", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.searchObjectives).mockReturnValue(mockResults);

      await request(app)
        .get("/curriculum/search")
        .query({ q: "count", subject: "Math" });

      expect(curriculumPack.searchObjectives).toHaveBeenCalledWith(
        "Math",
        "count",
        undefined
      );
    });

    it("should include grade in response when provided", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.searchObjectives).mockReturnValue(mockResults);

      const response = await request(app)
        .get("/curriculum/search")
        .query({ q: "count", subject: "Math", grade: "1" });

      expect(response.status).toBe(200);
      expect(response.body.grade).toBe("1");
    });

    it("should include null grade in response when not provided", async () => {
      vi.mocked(curriculumPack.hasSubjectPack).mockReturnValue(true);
      vi.mocked(curriculumPack.searchObjectives).mockReturnValue(mockResults);

      const response = await request(app)
        .get("/curriculum/search")
        .query({ q: "count", subject: "Math" });

      expect(response.status).toBe(200);
      expect(response.body.grade).toBeNull();
    });
  });
});
