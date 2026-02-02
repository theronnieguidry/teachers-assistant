import { describe, it, expect } from "vitest";
import {
  validateMathAnswers,
  validateAnswerKeyAgainstWorksheet,
  getValidationRulesForGrade,
  validateGradeAppropriateness,
} from "../../../services/premium/math-validator.js";

describe("Math Validator Service", () => {
  describe("validateMathAnswers", () => {
    it("should validate correct addition expressions", () => {
      const html = `
        <p>1. 3 + 4 = 7</p>
        <p>2. 5 + 2 = 7</p>
        <p>3. 1 + 1 = 2</p>
      `;

      const result = validateMathAnswers(html, "1");

      expect(result.valid).toBe(true);
      expect(result.totalExpressions).toBe(3);
      expect(result.correctCount).toBe(3);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect incorrect answers", () => {
      const html = `
        <p>1. 3 + 4 = 8</p>
        <p>2. 5 + 2 = 7</p>
      `;

      const result = validateMathAnswers(html, "1");

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].statedAnswer).toBe(8);
      expect(result.issues[0].expectedAnswer).toBe(7);
    });

    it("should validate subtraction expressions", () => {
      const html = `
        <p>10 - 3 = 7</p>
        <p>8 - 5 = 3</p>
      `;

      const result = validateMathAnswers(html, "1");

      expect(result.valid).toBe(true);
      expect(result.totalExpressions).toBe(2);
    });

    it("should validate multiplication expressions", () => {
      const html = `
        <p>3 × 4 = 12</p>
        <p>5 * 2 = 10</p>
      `;

      const result = validateMathAnswers(html, "3");

      expect(result.valid).toBe(true);
      expect(result.totalExpressions).toBe(2);
    });

    it("should validate division expressions", () => {
      const html = `
        <p>12 ÷ 4 = 3</p>
        <p>10 / 2 = 5</p>
      `;

      const result = validateMathAnswers(html, "3");

      expect(result.valid).toBe(true);
    });

    it("should handle expressions without spaces", () => {
      const html = `<p>3+4=7</p>`;

      const result = validateMathAnswers(html, "1");

      expect(result.totalExpressions).toBeGreaterThan(0);
      expect(result.valid).toBe(true);
    });

    it("should detect multiple errors", () => {
      const html = `
        <p>2 + 2 = 5</p>
        <p>3 + 3 = 7</p>
        <p>4 + 4 = 8</p>
      `;

      const result = validateMathAnswers(html, "1");

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(2);
    });

    it("should handle HTML tags in content", () => {
      const html = `
        <div class="question">
          <strong>1.</strong> <span>3 + 4 = 7</span>
        </div>
      `;

      const result = validateMathAnswers(html, "1");

      expect(result.totalExpressions).toBeGreaterThan(0);
    });

    it("should return empty results for text without math", () => {
      const html = `<p>This is just regular text without any math.</p>`;

      const result = validateMathAnswers(html, "1");

      expect(result.totalExpressions).toBe(0);
      expect(result.valid).toBe(true);
    });
  });

  describe("validateAnswerKeyAgainstWorksheet", () => {
    it("should validate both worksheet and answer key", () => {
      const worksheetHtml = `
        <p>1. 3 + 4 = ?</p>
        <p>2. 5 + 2 = ?</p>
      `;
      const answerKeyHtml = `
        <p>1. 3 + 4 = 7</p>
        <p>2. 5 + 2 = 7</p>
      `;

      const result = validateAnswerKeyAgainstWorksheet(worksheetHtml, answerKeyHtml, "1");

      expect(result.valid).toBe(true);
    });

    it("should detect errors in answer key", () => {
      const worksheetHtml = `<p>1. 3 + 4 = ?</p>`;
      const answerKeyHtml = `<p>1. 3 + 4 = 8</p>`;

      const result = validateAnswerKeyAgainstWorksheet(worksheetHtml, answerKeyHtml, "1");

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(1);
    });
  });

  describe("getValidationRulesForGrade", () => {
    it("should return appropriate rules for Kindergarten", () => {
      const rules = getValidationRulesForGrade("K");

      expect(rules.maxNumber).toBe(10);
      expect(rules.allowedOperations).toContain("+");
      expect(rules.allowedOperations).toContain("-");
      expect(rules.allowedOperations).not.toContain("*");
      expect(rules.allowDecimals).toBe(false);
      expect(rules.allowNegatives).toBe(false);
    });

    it("should return appropriate rules for Grade 1", () => {
      const rules = getValidationRulesForGrade("1");

      expect(rules.maxNumber).toBe(20);
      expect(rules.allowedOperations).toContain("+");
      expect(rules.allowedOperations).toContain("-");
    });

    it("should return appropriate rules for Grade 2", () => {
      const rules = getValidationRulesForGrade("2");

      expect(rules.maxNumber).toBe(100);
    });

    it("should return appropriate rules for Grade 3", () => {
      const rules = getValidationRulesForGrade("3");

      expect(rules.maxNumber).toBe(1000);
      expect(rules.allowedOperations).toContain("*");
      expect(rules.allowedOperations).toContain("×");
      expect(rules.allowedOperations).toContain("/");
      expect(rules.allowedOperations).toContain("÷");
    });

    it("should return permissive rules for higher grades", () => {
      const rules = getValidationRulesForGrade("5");

      expect(rules.maxNumber).toBe(10000);
      expect(rules.allowDecimals).toBe(true);
      expect(rules.allowNegatives).toBe(true);
    });
  });

  describe("validateGradeAppropriateness", () => {
    it("should pass for grade-appropriate content", () => {
      const html = `
        <p>2 + 3 = 5</p>
        <p>7 - 4 = 3</p>
      `;

      const result = validateGradeAppropriateness(html, "K");

      expect(result.valid).toBe(true);
    });

    it("should flag numbers too large for grade", () => {
      const html = `<p>150 + 200 = 350</p>`;

      const result = validateGradeAppropriateness(html, "K");

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain("exceeds");
    });

    it("should flag inappropriate operations for grade", () => {
      const html = `<p>3 × 4 = 12</p>`;

      const result = validateGradeAppropriateness(html, "K");

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Multiplication"))).toBe(true);
    });

    it("should flag division for early grades", () => {
      const html = `<p>10 ÷ 2 = 5</p>`;

      const result = validateGradeAppropriateness(html, "1");

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Division"))).toBe(true);
    });

    it("should flag decimals for early grades", () => {
      const html = `<p>The answer is 3.5</p>`;

      const result = validateGradeAppropriateness(html, "K");

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Decimals"))).toBe(true);
    });

    it("should flag negative numbers for early grades", () => {
      const html = `<p>The temperature is -5 degrees</p>`;

      const result = validateGradeAppropriateness(html, "1");

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes("Negative"))).toBe(true);
    });

    it("should allow multiplication for Grade 3", () => {
      const html = `<p>3 × 4 = 12</p>`;

      const result = validateGradeAppropriateness(html, "3");

      expect(result.issues.filter(i => i.includes("Multiplication"))).toHaveLength(0);
    });
  });
});
