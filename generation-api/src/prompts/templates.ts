import type { Grade, ProjectOptions, ParsedInspiration } from "../types.js";

interface PromptContext {
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  inspiration: ParsedInspiration[];
}

/**
 * Detailed grade-level guidelines with specific expectations for:
 * - Vocabulary complexity
 * - Sentence structure
 * - Subject-appropriate skills
 * - Problem complexity
 */
const GRADE_GUIDELINES: Record<Grade, string> = {
  K: `Kindergarten (ages 5-6):
- Use very simple vocabulary (sight words, 1-2 syllable words)
- Short sentences (5-8 words max)
- Heavy use of pictures and visuals
- Math: counting 1-20, shapes, simple patterns
- Reading: letter recognition, rhyming, phonics basics
- Problems should be concrete and hands-on`,

  "1": `1st Grade (ages 6-7):
- Simple vocabulary with occasional new words introduced
- Sentences up to 10 words
- Math: addition/subtraction within 20, place value to 100
- Reading: CVC words, simple sight words, basic sentences
- Use familiar contexts: home, school, playground, family`,

  "2": `2nd Grade (ages 7-8):
- Grade-appropriate vocabulary, can introduce 2-3 new terms with context
- Sentences up to 15 words
- Math: addition/subtraction within 100, intro to multiplication concepts
- Reading: fluency focus, simple paragraphs, sequencing
- Word problems with 1-2 steps, relatable scenarios`,

  "3": `3rd Grade (ages 8-9):
- Expanding vocabulary, students can use context clues
- Multi-sentence instructions acceptable
- Math: multiplication/division facts, fractions intro, basic measurement
- Reading: chapter book level, inference skills, cause/effect
- Multi-step word problems, beginning research skills`,

  "4": `4th Grade (ages 9-10):
- Academic vocabulary can be introduced with definitions
- Complex sentences with multiple clauses acceptable
- Math: multi-digit operations, fraction operations, area/perimeter
- Reading: informational text, main idea, supporting details
- Real-world application problems, basic analysis`,

  "5": `5th Grade (ages 10-11):
- Subject-specific vocabulary expected
- Paragraph-length explanations acceptable
- Math: decimals, percentages, coordinate planes, volume
- Reading: analysis, compare/contrast, text structure
- Multi-step problems requiring written explanations`,

  "6": `6th Grade (ages 11-12):
- Pre-academic vocabulary, can handle technical terms
- Can process abstract concepts with scaffolding
- Math: ratios, algebraic expressions, statistics, geometry
- Reading: critical analysis, argument structure, synthesis
- Problems requiring explanation of reasoning and methodology`,
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
## Grade-Level Guidelines
${GRADE_GUIDELINES[ctx.grade]}

## Context
- Subject: ${ctx.subject}
- Difficulty: ${DIFFICULTY_INSTRUCTIONS[ctx.options.difficulty || "medium"]}
${ctx.options.includeVisuals ? `
## IMPORTANT: Visual Placeholders
You MUST include visual placeholders in your HTML using EXACTLY this format:
[VISUAL: search term]

Examples of correct usage:
- [VISUAL: red apple]
- [VISUAL: counting objects]
- [VISUAL: happy children]
- [VISUAL: math addition]

Place these placeholders where images should appear. Use 2-3 word descriptions.` : ""}

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
- Include exactly ${questionCount} questions/activities
- HEADER AT TOP: Include a clear header with:
  - Worksheet title (centered, large font)
  - "Name: _______________" line on the left
  - "Date: _______________" line on the right
- Use clear, age-appropriate instructions below the header
- Number ALL questions clearly (1., 2., 3., etc.)
- Provide answer lines using underscores: _______ (not HTML input fields)
- Each question must be complete and have exactly one correct answer
- Leave adequate vertical space between questions for handwriting
- Include a mix of question types when appropriate

## CRITICAL Print-Friendly Rules
- Do NOT use <input>, <form>, or interactive HTML elements
- Do NOT use box-shadow, gradients, or other non-printable CSS
- Do NOT use external fonts (Google Fonts) - use only: Arial, Helvetica, sans-serif
- Do NOT use colored backgrounds
- Use simple borders if needed (solid black only)
- Ensure all text is black (#000) for clear printing

## Format Rules
- Number questions sequentially: 1. 2. 3. etc. (no gaps!)${ctx.options.includeVisuals ? `
- Put visual placeholders on their own line ABOVE the question, not inline` : ""}
- Double-check that you created exactly ${questionCount} questions
- Verify each question directly relates to the teacher's request

## HTML Structure Example
Use this exact structure (do NOT wrap in markdown code blocks):

<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.8; color: #000; }
    .worksheet-header { border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
    .worksheet-header h1 { text-align: center; margin: 0 0 15px 0; font-size: 24px; }
    .student-info { display: flex; justify-content: space-between; }
    .instructions { margin-bottom: 25px; font-style: italic; padding: 10px; border: 1px solid #ccc; }
    .question { margin-bottom: 30px; }
    .question-number { font-weight: bold; }
  </style>
</head>
<body>
  <div class="worksheet-header">
    <h1>Worksheet Title Here</h1>
    <div class="student-info">
      <span>Name: _______________________</span>
      <span>Date: _______________</span>
    </div>
  </div>
  <div class="instructions">Instructions here...</div>
  <div class="question">
    <span class="question-number">1.</span> Question text here = _______
  </div>
  <!-- More questions... -->
</body>
</html>

Return ONLY valid HTML. Do NOT wrap output in markdown code blocks or backticks.
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

## CRITICAL Print-Friendly Rules
- Do NOT use box-shadow, gradients, or other non-printable CSS
- Do NOT use external fonts (Google Fonts) - use only: Arial, Helvetica, Georgia, Times New Roman
- Use light gray (#f5f5f5) or white backgrounds only
- Use simple borders if needed (solid black or gray only)
- Ensure all text is black or dark gray for clear printing

## HTML Structure Example
Use this exact structure (do NOT wrap in markdown code blocks):

<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #000; }
    h1 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
    h2 { background: #f5f5f5; padding: 8px 12px; margin-top: 25px; }
    ul, ol { margin-left: 20px; }
    .teacher-note { border-left: 3px solid #666; padding-left: 15px; font-style: italic; margin: 15px 0; }
    .time-estimate { font-weight: bold; color: #333; }
  </style>
</head>
<body>
  <!-- Your lesson plan content -->
</body>
</html>

Return ONLY valid HTML. Do NOT wrap output in markdown code blocks or backticks.
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

## CRITICAL Print-Friendly Rules
- Do NOT use box-shadow, gradients, or other non-printable CSS
- Do NOT use external fonts - use only: Arial, Helvetica, sans-serif
- Ensure all text is black (#000) for clear printing

## HTML Structure
Wrap your response in a complete HTML document with:
- DOCTYPE and html tags
- A style block matching the worksheet styling
- Clear correspondence to worksheet question numbers
- Distinct styling for answers vs explanations (e.g., answers in bold)
- A header clearly indicating this is the ANSWER KEY

Return ONLY valid HTML. Do NOT wrap output in markdown code blocks or backticks.
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
