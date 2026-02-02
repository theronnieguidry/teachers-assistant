/**
 * Math Validator Service
 *
 * Validates arithmetic answers in worksheets and answer keys.
 * For K-3 math content, ensures all computational answers are correct.
 */

export interface MathValidationResult {
  valid: boolean;
  totalExpressions: number;
  correctCount: number;
  issues: MathValidationIssue[];
}

export interface MathValidationIssue {
  questionNumber?: number;
  expression: string;
  statedAnswer: string | number;
  expectedAnswer: number;
  message: string;
}

// Regex patterns for different math expression formats
const EXPRESSION_PATTERNS = [
  // Pattern: "3 + 4 = 7"
  /(\d+)\s*([+\-×÷*\/])\s*(\d+)\s*=\s*(\d+)/g,
  // Pattern: "3+4=7" (no spaces)
  /(\d+)([+\-×÷*\/])(\d+)=(\d+)/g,
  // Pattern: "Q1: 3 + 4 = 7"
  /[Qq](?:uestion)?\s*(\d+)[:.]\s*(\d+)\s*([+\-×÷*\/])\s*(\d+)\s*=\s*(\d+)/g,
];

// Regex for answer key format: "1. 7" or "1) 7" or "Answer: 7"
const ANSWER_KEY_PATTERNS = [
  // Pattern: "1. 7" or "1) 7"
  /(?:^|\n)\s*(\d+)[.)]\s*(\d+(?:\.\d+)?)/g,
  // Pattern: "Answer 1: 7" or "Answer: 7"
  /[Aa]nswer\s*(?:\d+)?[:.]\s*(\d+(?:\.\d+)?)/g,
];

/**
 * Parse operator character to math operation
 */
function parseOperator(op: string): ((a: number, b: number) => number) | null {
  switch (op) {
    case "+":
      return (a, b) => a + b;
    case "-":
      return (a, b) => a - b;
    case "*":
    case "×":
      return (a, b) => a * b;
    case "/":
    case "÷":
      return (a, b) => a / b;
    default:
      return null;
  }
}

/**
 * Evaluate a simple arithmetic expression
 */
function evaluateExpression(
  left: number,
  operator: string,
  right: number
): number | null {
  const op = parseOperator(operator);
  if (!op) return null;

  const result = op(left, right);

  // Handle division edge cases
  if ((operator === "/" || operator === "÷") && right === 0) {
    return null; // Division by zero
  }

  return result;
}

/**
 * Extract and validate math expressions from HTML content
 */
export function validateMathAnswers(
  html: string,
  grade: string
): MathValidationResult {
  const issues: MathValidationIssue[] = [];
  let totalExpressions = 0;
  let correctCount = 0;

  // Strip HTML tags for cleaner parsing
  const textContent = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");

  // Try each pattern to find expressions
  for (const pattern of EXPRESSION_PATTERNS) {
    // Create new regex instance for each iteration
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(textContent)) !== null) {
      // Handle different capture group arrangements
      let left: number, operator: string, right: number, stated: number;
      let questionNum: number | undefined;

      if (match.length === 5) {
        // Pattern without question number
        [, left, operator, right, stated] = match.map((v, i) =>
          i === 0 || i === 2 ? v : Number(v)
        ) as [string, number, string, number, number];
      } else if (match.length === 6) {
        // Pattern with question number
        [, questionNum, left, operator, right, stated] = match.map((v, i) =>
          i === 0 || i === 3 ? v : Number(v)
        ) as [string, number, number, string, number, number];
      } else {
        continue;
      }

      // Cast to correct types
      const leftNum = Number(left);
      const rightNum = Number(right);
      const statedNum = Number(stated);

      totalExpressions++;

      const expected = evaluateExpression(leftNum, String(operator), rightNum);

      if (expected === null) {
        issues.push({
          questionNumber: questionNum,
          expression: `${leftNum} ${operator} ${rightNum}`,
          statedAnswer: statedNum,
          expectedAnswer: NaN,
          message: `Cannot evaluate expression: ${leftNum} ${operator} ${rightNum}`,
        });
        continue;
      }

      // For K-3, we expect whole number answers
      // Allow for rounding in division
      const tolerance = grade === "K" || grade === "1" ? 0 : 0.01;
      const isCorrect = Math.abs(expected - statedNum) <= tolerance;

      if (isCorrect) {
        correctCount++;
      } else {
        issues.push({
          questionNumber: questionNum,
          expression: `${leftNum} ${operator} ${rightNum}`,
          statedAnswer: statedNum,
          expectedAnswer: expected,
          message: `Incorrect answer: ${leftNum} ${operator} ${rightNum} = ${statedNum}, expected ${expected}`,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    totalExpressions,
    correctCount,
    issues,
  };
}

/**
 * Extract Q&A pairs from answer key HTML and validate them
 * against the worksheet HTML
 */
export function validateAnswerKeyAgainstWorksheet(
  worksheetHtml: string,
  answerKeyHtml: string,
  grade: string
): MathValidationResult {
  // First validate any inline expressions in both documents
  const worksheetResult = validateMathAnswers(worksheetHtml, grade);
  const answerKeyResult = validateMathAnswers(answerKeyHtml, grade);

  // Combine results
  const allIssues = [...worksheetResult.issues, ...answerKeyResult.issues];
  const totalExpressions =
    worksheetResult.totalExpressions + answerKeyResult.totalExpressions;
  const correctCount =
    worksheetResult.correctCount + answerKeyResult.correctCount;

  return {
    valid: allIssues.length === 0,
    totalExpressions,
    correctCount,
    issues: allIssues,
  };
}

/**
 * Grade-appropriate validation rules
 */
export function getValidationRulesForGrade(grade: string): {
  maxNumber: number;
  allowedOperations: string[];
  allowDecimals: boolean;
  allowNegatives: boolean;
} {
  switch (grade) {
    case "K":
      return {
        maxNumber: 10,
        allowedOperations: ["+", "-"],
        allowDecimals: false,
        allowNegatives: false,
      };
    case "1":
      return {
        maxNumber: 20,
        allowedOperations: ["+", "-"],
        allowDecimals: false,
        allowNegatives: false,
      };
    case "2":
      return {
        maxNumber: 100,
        allowedOperations: ["+", "-"],
        allowDecimals: false,
        allowNegatives: false,
      };
    case "3":
      return {
        maxNumber: 1000,
        allowedOperations: ["+", "-", "*", "×", "/", "÷"],
        allowDecimals: false,
        allowNegatives: false,
      };
    default:
      return {
        maxNumber: 10000,
        allowedOperations: ["+", "-", "*", "×", "/", "÷"],
        allowDecimals: true,
        allowNegatives: true,
      };
  }
}

/**
 * Validate that numbers in worksheet are grade-appropriate
 */
export function validateGradeAppropriateness(
  html: string,
  grade: string
): { valid: boolean; issues: string[] } {
  const rules = getValidationRulesForGrade(grade);
  const issues: string[] = [];

  // Strip HTML and find all numbers
  const textContent = html.replace(/<[^>]*>/g, " ");
  const numbers = textContent.match(/\d+/g) || [];

  for (const numStr of numbers) {
    const num = parseInt(numStr, 10);
    if (num > rules.maxNumber) {
      issues.push(
        `Number ${num} exceeds grade ${grade} maximum of ${rules.maxNumber}`
      );
    }
  }

  // Check for inappropriate operations
  if (!rules.allowedOperations.includes("×") && /×/.test(textContent)) {
    issues.push(`Multiplication not appropriate for grade ${grade}`);
  }
  if (!rules.allowedOperations.includes("÷") && /÷/.test(textContent)) {
    issues.push(`Division not appropriate for grade ${grade}`);
  }

  // Check for decimals
  if (!rules.allowDecimals && /\d+\.\d+/.test(textContent)) {
    issues.push(`Decimals not appropriate for grade ${grade}`);
  }

  // Check for negatives
  if (!rules.allowNegatives && /-\d+/.test(textContent)) {
    issues.push(`Negative numbers not appropriate for grade ${grade}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
