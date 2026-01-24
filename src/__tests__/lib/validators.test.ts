import { describe, it, expect } from "vitest";
import {
  signInSchema,
  signUpSchema,
  classDetailsSchema,
  projectPromptSchema,
} from "@/lib/validators";

describe("validators", () => {
  describe("signInSchema", () => {
    it("should validate correct sign in data", () => {
      const result = signInSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = signInSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("email");
        expect(result.error.issues[0].message).toBe("Please enter a valid email address");
      }
    });

    it("should reject short password", () => {
      const result = signInSchema.safeParse({
        email: "test@example.com",
        password: "12345",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("password");
        expect(result.error.issues[0].message).toBe("Password must be at least 6 characters");
      }
    });

    it("should reject empty email", () => {
      const result = signInSchema.safeParse({
        email: "",
        password: "password123",
      });

      expect(result.success).toBe(false);
    });

    it("should reject missing fields", () => {
      const result = signInSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });

  describe("signUpSchema", () => {
    it("should validate correct sign up data", () => {
      const result = signUpSchema.safeParse({
        email: "new@example.com",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(true);
    });

    it("should reject mismatched passwords", () => {
      const result = signUpSchema.safeParse({
        email: "new@example.com",
        password: "password123",
        confirmPassword: "different",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("confirmPassword");
        expect(result.error.issues[0].message).toBe("Passwords don't match");
      }
    });

    it("should reject invalid email", () => {
      const result = signUpSchema.safeParse({
        email: "not-an-email",
        password: "password123",
        confirmPassword: "password123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const emailError = result.error.issues.find((i) => i.path.includes("email"));
        expect(emailError).toBeDefined();
      }
    });

    it("should reject short password", () => {
      const result = signUpSchema.safeParse({
        email: "test@example.com",
        password: "123",
        confirmPassword: "123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const passwordError = result.error.issues.find((i) =>
          i.path.includes("password") && i.message.includes("at least 6")
        );
        expect(passwordError).toBeDefined();
      }
    });
  });

  describe("classDetailsSchema", () => {
    it("should validate correct class details", () => {
      const result = classDetailsSchema.safeParse({
        grade: "2",
        subject: "Math",
        format: "worksheet",
        questionCount: 10,
        includeVisuals: true,
        difficulty: "medium",
        includeAnswerKey: true,
      });

      expect(result.success).toBe(true);
    });

    it("should apply defaults for optional fields", () => {
      const result = classDetailsSchema.safeParse({
        grade: "K",
        subject: "Reading",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe("both");
        expect(result.data.questionCount).toBe(10);
        expect(result.data.includeVisuals).toBe(true);
        expect(result.data.difficulty).toBe("medium");
        expect(result.data.includeAnswerKey).toBe(true);
      }
    });

    it("should reject invalid grade", () => {
      const result = classDetailsSchema.safeParse({
        grade: "10",
        subject: "Math",
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid grades", () => {
      const grades = ["K", "1", "2", "3", "4", "5", "6"];

      for (const grade of grades) {
        const result = classDetailsSchema.safeParse({
          grade,
          subject: "Math",
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject empty subject", () => {
      const result = classDetailsSchema.safeParse({
        grade: "2",
        subject: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid format", () => {
      const result = classDetailsSchema.safeParse({
        grade: "2",
        subject: "Math",
        format: "invalid",
      });

      expect(result.success).toBe(false);
    });

    it("should accept all valid formats", () => {
      const formats = ["worksheet", "lesson_plan", "both"];

      for (const format of formats) {
        const result = classDetailsSchema.safeParse({
          grade: "2",
          subject: "Math",
          format,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject question count below minimum", () => {
      const result = classDetailsSchema.safeParse({
        grade: "2",
        subject: "Math",
        questionCount: 3,
      });

      expect(result.success).toBe(false);
    });

    it("should reject question count above maximum", () => {
      const result = classDetailsSchema.safeParse({
        grade: "2",
        subject: "Math",
        questionCount: 25,
      });

      expect(result.success).toBe(false);
    });

    it("should accept question count within range", () => {
      const result = classDetailsSchema.safeParse({
        grade: "2",
        subject: "Math",
        questionCount: 15,
      });

      expect(result.success).toBe(true);
    });

    it("should accept all valid difficulty levels", () => {
      const difficulties = ["easy", "medium", "hard"];

      for (const difficulty of difficulties) {
        const result = classDetailsSchema.safeParse({
          grade: "2",
          subject: "Math",
          difficulty,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("projectPromptSchema", () => {
    it("should validate correct prompt data", () => {
      const result = projectPromptSchema.safeParse({
        prompt: "Create a multiplication worksheet for grade 2",
        title: "Multiplication Practice",
      });

      expect(result.success).toBe(true);
    });

    it("should reject prompt that is too short", () => {
      const result = projectPromptSchema.safeParse({
        prompt: "Short",
        title: "Title",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const promptError = result.error.issues.find((i) => i.path.includes("prompt"));
        expect(promptError?.message).toContain("at least 10 characters");
      }
    });

    it("should reject prompt that is too long", () => {
      const result = projectPromptSchema.safeParse({
        prompt: "A".repeat(1001),
        title: "Title",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const promptError = result.error.issues.find((i) => i.path.includes("prompt"));
        expect(promptError?.message).toContain("too long");
      }
    });

    it("should accept prompt at minimum length", () => {
      const result = projectPromptSchema.safeParse({
        prompt: "1234567890", // exactly 10 chars
        title: "T",
      });

      expect(result.success).toBe(true);
    });

    it("should accept prompt at maximum length", () => {
      const result = projectPromptSchema.safeParse({
        prompt: "A".repeat(1000), // exactly 1000 chars
        title: "T",
      });

      expect(result.success).toBe(true);
    });

    it("should reject empty title", () => {
      const result = projectPromptSchema.safeParse({
        prompt: "Create a worksheet",
        title: "",
      });

      expect(result.success).toBe(false);
    });

    it("should reject title that is too long", () => {
      const result = projectPromptSchema.safeParse({
        prompt: "Create a worksheet",
        title: "A".repeat(101),
      });

      expect(result.success).toBe(false);
    });
  });
});
