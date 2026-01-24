import type { Grade, ProjectOptions, ParsedInspiration } from "../types.js";

interface PromptContext {
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  inspiration: ParsedInspiration[];
}

const GRADE_DESCRIPTIONS: Record<Grade, string> = {
  K: "Kindergarten (ages 5-6)",
  "1": "1st Grade (ages 6-7)",
  "2": "2nd Grade (ages 7-8)",
  "3": "3rd Grade (ages 8-9)",
  "4": "4th Grade (ages 9-10)",
  "5": "5th Grade (ages 10-11)",
  "6": "6th Grade (ages 11-12)",
};

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  easy: "Use simple vocabulary and straightforward problems. Provide extra scaffolding and hints.",
  medium:
    "Use grade-appropriate vocabulary. Include a mix of straightforward and slightly challenging problems.",
  hard: "Include challenging problems that require critical thinking. Use advanced vocabulary for the grade level.",
};

function formatInspiration(inspiration: ParsedInspiration[]): string {
  if (inspiration.length === 0) return "";

  return `
## Reference Materials
The teacher has provided these materials for inspiration:
${inspiration
  .map(
    (item, i) => `
### Reference ${i + 1}: ${item.title}
Type: ${item.type}
Content:
${item.extractedContent}
`
  )
  .join("\n")}

Please incorporate ideas, styles, or content from these references where appropriate.
`;
}

function getCommonInstructions(ctx: PromptContext): string {
  return `
## Context
- Target audience: ${GRADE_DESCRIPTIONS[ctx.grade]}
- Subject: ${ctx.subject}
- Difficulty: ${DIFFICULTY_INSTRUCTIONS[ctx.options.difficulty || "medium"]}
${ctx.options.includeVisuals ? "- Include placeholder descriptions for visuals/images in [VISUAL: description] format" : ""}

## Teacher's Request
${ctx.prompt}
${formatInspiration(ctx.inspiration)}
## Output Format
Return valid HTML that can be printed. Use clean, semantic HTML with inline CSS for styling.
The HTML should be self-contained and print-friendly.
`;
}

export function buildWorksheetPrompt(ctx: PromptContext): string {
  const questionCount = ctx.options.questionCount || 10;

  return `You are an expert elementary school teacher creating educational worksheets.

Create a worksheet with the following specifications:
${getCommonInstructions(ctx)}

## Worksheet Requirements
- Include approximately ${questionCount} questions/activities
- Include a title section with the worksheet name, student name field, and date field
- Use clear, age-appropriate instructions
- Number all questions/problems
- Leave adequate space for student responses
- Include a mix of question types when appropriate (multiple choice, fill-in-blank, short answer)
- Make the layout visually appealing for young learners

## HTML Structure
Wrap your response in a complete HTML document with these elements:
- DOCTYPE and html tags
- A style block with print-friendly CSS (avoid colors that waste ink)
- Clear section separation
- Appropriate fonts and sizing for the grade level

Return ONLY the HTML code, no explanations.
`;
}

export function buildLessonPlanPrompt(ctx: PromptContext): string {
  return `You are an expert elementary school teacher creating detailed lesson plans.

Create a lesson plan with the following specifications:
${getCommonInstructions(ctx)}

## Lesson Plan Requirements
Include these sections:
1. **Learning Objectives** - 3-5 specific, measurable objectives
2. **Materials Needed** - List all required materials
3. **Warm-Up Activity** (5-10 minutes) - Engaging introduction
4. **Direct Instruction** (15-20 minutes) - Core teaching content
5. **Guided Practice** (10-15 minutes) - Teacher-led practice
6. **Independent Practice** (10-15 minutes) - Student work time
7. **Closure** (5 minutes) - Summary and assessment check
8. **Differentiation** - Modifications for different learners
9. **Assessment** - How to evaluate student understanding

## HTML Structure
Wrap your response in a complete HTML document with:
- DOCTYPE and html tags
- A style block with professional, print-friendly CSS
- Clear section headings
- Bulleted and numbered lists where appropriate
- Teacher notes in a distinct style

Return ONLY the HTML code, no explanations.
`;
}

export function buildAnswerKeyPrompt(
  ctx: PromptContext,
  worksheetHtml: string
): string {
  return `You are an expert elementary school teacher creating an answer key.

Create an answer key for the following worksheet:

## Original Worksheet
\`\`\`html
${worksheetHtml}
\`\`\`

## Context
${getCommonInstructions(ctx)}

## Answer Key Requirements
- Provide complete answers for ALL questions in the worksheet
- Include explanations or worked solutions where helpful
- Note any acceptable alternative answers
- Include scoring guidelines (point values)
- Add teaching tips for common misconceptions

## HTML Structure
Wrap your response in a complete HTML document with:
- DOCTYPE and html tags
- A style block matching the worksheet styling
- Clear correspondence to worksheet question numbers
- Distinct styling for answers vs explanations
- A header indicating this is the ANSWER KEY

Return ONLY the HTML code, no explanations.
`;
}

export function buildInspirationParsePrompt(
  content: string,
  type: string
): string {
  return `Extract the key educational content from this ${type} for use as teaching material inspiration.

Content:
${content}

Return a summary that captures:
- Main topics and concepts covered
- Teaching approaches or methodologies used
- Question types or activity formats
- Visual elements or layout ideas
- Any grade-level indicators

Keep the summary focused and relevant for creating educational materials.
Return plain text, no markdown or formatting.
`;
}
