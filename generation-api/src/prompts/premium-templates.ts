/**
 * Premium Pipeline Prompt Templates
 *
 * These templates are used for the structured premium generation pipeline:
 * Plan → Validate → Assemble → Image → Quality Gate
 */

import type { Grade, ProjectOptions, ParsedInspiration } from "../types.js";
import type {
  WorksheetPlan,
  VisualSettings,
  ValidationIssue,
  ImprovementType,
} from "../types/premium.js";

// ============================================
// Grade-Level Pedagogy Guidelines
// ============================================

const GRADE_PEDAGOGY: Record<Grade, string> = {
  K: `Kindergarten (ages 5-6):
- Questions should use concrete, hands-on concepts
- Maximum 2-3 sentence questions
- Focus: counting 1-20, shapes, colors, letter recognition, simple patterns
- Answers: single word or number, circling options, matching
- Reading load: minimal - use pictures to convey meaning
- Vocabulary: basic sight words only (the, is, a, can, see)`,

  "1": `1st Grade (ages 6-7):
- Questions can have 1-2 step instructions
- Focus: addition/subtraction within 20, CVC words, simple sight words
- Answers: single word/number, fill-in-blank with word bank
- Reading load: short sentences (5-8 words)
- Vocabulary: common sight words, 1-2 syllable words`,

  "2": `2nd Grade (ages 7-8):
- Questions can be 1-2 sentences
- Focus: add/subtract within 100, place value, basic multiplication concepts
- Answers: short phrases, simple sentences, multiple choice
- Reading load: short paragraphs acceptable
- Vocabulary: grade-appropriate, can introduce 1-2 new terms with context`,

  "3": `3rd Grade (ages 8-9):
- Multi-sentence questions acceptable
- Focus: multiplication/division facts, fractions intro, reading comprehension
- Answers: sentences, short explanations
- Reading load: longer paragraphs, multi-step problems
- Vocabulary: expanding academic vocabulary`,

  "4": `4th Grade (ages 9-10):
- Complex multi-step problems acceptable
- Focus: multi-digit operations, fraction operations, informational text
- Answers: written explanations, show work
- Reading load: grade-level passages
- Vocabulary: subject-specific terms with definitions`,

  "5": `5th Grade (ages 10-11):
- Abstract concepts with scaffolding acceptable
- Focus: decimals, percentages, analysis, compare/contrast
- Answers: detailed written responses
- Reading load: complex informational text
- Vocabulary: technical terms in context`,

  "6": `6th Grade (ages 11-12):
- Pre-academic rigor acceptable
- Focus: ratios, algebra, statistics, critical analysis
- Answers: extended responses with reasoning
- Reading load: advanced informational and literary text
- Vocabulary: academic and technical vocabulary`,
};

// ============================================
// Planner Prompt
// ============================================

export interface PlannerContext {
  prompt: string;
  grade: Grade;
  subject: string;
  options: ProjectOptions;
  visualSettings: VisualSettings;
  inspiration?: {
    designItems: string[];
    contentItems: string[];
  };
}

export function buildPlannerPrompt(ctx: PlannerContext): string {
  const questionCount = ctx.options.questionCount || 10;
  const difficulty = ctx.options.difficulty || "medium";

  // Determine how many images to suggest based on richness
  let imageGuidance = "";
  if (ctx.visualSettings.includeVisuals) {
    const imageCount =
      ctx.visualSettings.richness === "minimal"
        ? "1-2"
        : ctx.visualSettings.richness === "standard"
        ? "3-5"
        : "one per question when helpful";
    imageGuidance = `
- Include ${imageCount} visual placements
- Visual style preference: ${ctx.visualSettings.style.replace(/_/g, " ")}
${ctx.visualSettings.theme ? `- Theme: ${ctx.visualSettings.theme}` : ""}`;
  }

  const inspirationSection =
    ctx.inspiration?.contentItems?.length || ctx.inspiration?.designItems?.length
      ? `
## Reference Materials
${ctx.inspiration.designItems?.length ? `Design inspiration:\n${ctx.inspiration.designItems.join("\n")}` : ""}
${ctx.inspiration.contentItems?.length ? `Content inspiration:\n${ctx.inspiration.contentItems.join("\n")}` : ""}`
      : "";

  return `You are an expert K-6 curriculum designer. Create a structured worksheet plan in JSON format.

## Teacher's Request
${ctx.prompt}

## Requirements
- Grade: ${ctx.grade}
- Subject: ${ctx.subject}
- Difficulty: ${difficulty}
- Question count: exactly ${questionCount} questions
${imageGuidance}

## Grade-Level Guidelines
${GRADE_PEDAGOGY[ctx.grade]}
${inspirationSection}

## JSON Structure
Return a JSON object with this EXACT structure (no markdown, just pure JSON):

{
  "version": "1.0",
  "metadata": {
    "title": "Clear, descriptive title",
    "grade": "${ctx.grade}",
    "subject": "${ctx.subject}",
    "topic": "Specific topic from teacher's request",
    "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
    "estimatedTime": "15-20 minutes"
  },
  "structure": {
    "header": {
      "title": "Same as metadata title",
      "hasNameLine": true,
      "hasDateLine": true,
      "instructions": "Brief, age-appropriate instructions"
    },
    "sections": [
      {
        "id": "s1",
        "type": "questions",
        "title": "Optional section title",
        "items": [
          {
            "id": "q1",
            "questionText": "Question text here",
            "questionType": "multiple_choice",
            "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
            "correctAnswer": "B) Option 2",
            "explanation": "Why this is correct (for answer key)"
          }
        ]
      }
    ]
  },
  "style": {
    "difficulty": "${difficulty}",
    "visualStyle": "${ctx.visualSettings.richness}"${ctx.visualSettings.theme ? `,
    "theme": "${ctx.visualSettings.theme}"` : ""}
  }${
    ctx.visualSettings.includeVisuals
      ? `,
  "visualPlacements": [
    {
      "afterItemId": "q2",
      "description": "2-3 word description for image generation",
      "purpose": "counting_support",
      "size": "medium"
    }
  ]`
      : ""
  }
}

## Question Type Options
- "multiple_choice": Include "options" array with A-D choices
- "fill_blank": Include blanks in questionText using _____
- "short_answer": Open-ended response
- "matching": Include matching pairs
- "true_false": Include "options": ["True", "False"]
- "word_problem": Math story problems
- "drawing": Creative/visual response

## Critical Rules
1. Return ONLY valid JSON - no markdown, no explanation
2. Every item MUST have a correct "correctAnswer"
3. Include exactly ${questionCount} items across all sections
4. Questions must be grade-appropriate (see guidelines above)
5. Avoid trick questions - K-3 students need clear, direct questions
6. For multiple choice, correctAnswer must exactly match one option
7. ${ctx.visualSettings.includeVisuals ? `Add visualPlacements for instructionally useful images. Valid purposes: counting_support, phonics_cue, shape_diagram, word_problem_context, science_diagram_simple, matching_support, diagram. Sizes: small, medium, wide` : "Do not add visualPlacements"}
8. Do NOT add visual properties (visualHint, imageDescription, visual, etc.) to individual items. All image data must go in the top-level visualPlacements array only`;
}

// ============================================
// Validator Repair Prompt
// ============================================

export function buildRepairPrompt(
  plan: WorksheetPlan,
  issues: ValidationIssue[]
): string {
  const issuesList = issues
    .map(
      (i) =>
        `- [${i.severity.toUpperCase()}] ${i.field}: ${i.message}${i.suggestion ? ` (Suggestion: ${i.suggestion})` : ""}`
    )
    .join("\n");

  return `You are a curriculum validator. Fix the following issues in this worksheet plan.

## Current Plan
\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

## Issues to Fix
${issuesList}

## Instructions
1. Return the COMPLETE fixed plan as valid JSON
2. Address ALL issues listed above
3. Preserve all other parts of the plan unchanged
4. Return ONLY the JSON, no markdown or explanation

Return the fixed JSON:`;
}

// ============================================
// HTML Assembler Instructions
// ============================================

export function getHtmlAssemblyInstructions(plan: WorksheetPlan): string {
  return `Convert this worksheet plan to clean, print-ready HTML.

## Plan
\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

## HTML Requirements
- Self-contained HTML document with DOCTYPE
- Inline CSS only (no external stylesheets)
- Font: Arial, Helvetica, sans-serif
- Print-friendly: no shadows, gradients, or interactive elements
- Answer blanks: use underscores _______, not <input> tags
- Question numbers: 1., 2., 3. etc.
- Header with title, Name line, Date line
- Clear visual hierarchy with proper spacing
- All text in black (#000) for printing

## Visual Placeholder Format
${
  plan.visualPlacements?.length
    ? `Include these placeholders exactly where indicated:
${plan.visualPlacements
  .map(
    (v) =>
      `- After item ${v.afterItemId}: <div class="visual-placeholder">[VISUAL: ${v.description}]</div>`
  )
  .join("\n")}`
    : "No visual placeholders needed."
}

Return ONLY valid HTML:`;
}

// ============================================
// Image Generation Prompt Builder
// ============================================

export function buildImagePrompt(
  description: string,
  style: string,
  context: { grade: Grade; subject: string; theme?: string }
): string {
  const styleInstructions: Record<string, string> = {
    friendly_cartoon:
      "friendly cartoon style, colorful, child-appropriate, simple shapes, happy expressions",
    simple_icons:
      "simple flat icon style, minimal colors, clean lines, educational icons",
    black_white:
      "black and white line art, coloring book style, clear outlines, no shading",
  };

  const gradeAppropriate =
    parseInt(context.grade) <= 2 || context.grade === "K"
      ? "very simple and friendly, suitable for young children ages 5-8"
      : parseInt(context.grade) <= 4
      ? "appropriate for elementary students ages 8-10"
      : "appropriate for upper elementary students ages 10-12";

  return `Create an educational illustration: ${description}

Style: ${styleInstructions[style] || styleInstructions.friendly_cartoon}
Context: ${context.subject} worksheet for grade ${context.grade}
Age-appropriate: ${gradeAppropriate}
${context.theme ? `Theme: ${context.theme}` : ""}

Requirements:
- Safe for children, no scary or inappropriate content
- No text or words in the image
- Clear, recognizable subject matter
- High contrast for printing
- Educational and engaging`;
}

// ============================================
// Improvement Prompts
// ============================================

export function buildImprovementPrompt(
  type: ImprovementType,
  currentHtml: string,
  context: { grade: Grade; subject: string }
): string {
  const improvementInstructions: Record<ImprovementType, string> = {
    fix_confusing: `Review this worksheet and reword any unclear or ambiguous questions.
Make instructions clearer and more direct for grade ${context.grade} students.
Keep the same question topics but improve clarity.`,

    simplify: `Simplify this worksheet for grade ${context.grade}:
- Use simpler vocabulary
- Shorten sentences
- Add hints or scaffolding
- Reduce complexity while keeping learning objectives`,

    add_questions: `Add 3-5 more questions to this worksheet.
- Match the existing style and difficulty
- Cover the same topic
- Maintain grade ${context.grade} appropriateness
- Number sequentially after existing questions`,

    add_visuals: `Add 2-3 visual placeholders to this worksheet.
- Use format: [VISUAL: 2-3 word description]
- Place where images would aid understanding
- Choose appropriate spots for grade ${context.grade}`,

    make_harder: `Increase the difficulty of this worksheet:
- Use more challenging vocabulary (still grade-appropriate)
- Add multi-step problems
- Reduce scaffolding
- Require more critical thinking`,

    make_easier: `Reduce the difficulty of this worksheet:
- Simplify vocabulary
- Break complex problems into steps
- Add hints and word banks
- Use more straightforward question formats`,
  };

  return `You are improving an educational worksheet for ${context.subject}, grade ${context.grade}.

## Current Worksheet
\`\`\`html
${currentHtml}
\`\`\`

## Improvement Task
${improvementInstructions[type]}

## Output Requirements
- Return the COMPLETE improved HTML document
- Maintain print-friendly formatting
- Keep the same general structure and styling
- Return ONLY valid HTML, no markdown

Return the improved HTML:`;
}

// ============================================
// Answer Key Assembly
// ============================================

export function buildAnswerKeyFromPlan(
  plan: WorksheetPlan,
  worksheetHtml: string
): string {
  return `Create an answer key HTML document for this worksheet.

## Worksheet Plan (contains correct answers)
\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

## Original Worksheet HTML
\`\`\`html
${worksheetHtml}
\`\`\`

## Answer Key Requirements
1. Clear "ANSWER KEY" header
2. Match worksheet question numbering exactly
3. Show correct answers prominently (bold or highlighted)
4. Include explanations from the plan
5. Add scoring guidelines
6. Note alternative acceptable answers where applicable

## HTML Format
- Self-contained HTML document
- Print-friendly (same rules as worksheet)
- Visual distinction: answers in bold, explanations in italics
- Green accent color (#2d6a4f) for answer sections

Return ONLY valid HTML:`;
}

// ============================================
// Lesson Plan Assembly
// ============================================

export function buildLessonPlanFromWorksheet(
  plan: WorksheetPlan,
  worksheetHtml: string
): string {
  return `Create a lesson plan HTML document to accompany this worksheet.

## Worksheet Plan
\`\`\`json
${JSON.stringify(plan, null, 2)}
\`\`\`

## Lesson Plan Requirements
Based on the worksheet, create a lesson plan with:

1. **Learning Objectives** - derived from plan.metadata.learningObjectives
2. **Materials Needed** - worksheet copies, any manipulatives, supplies
3. **Warm-Up Activity** (5-10 min) - engaging intro to the topic
4. **Direct Instruction** (15-20 min) - teaching the core concepts
5. **Guided Practice** (10-15 min) - work through examples together
6. **Independent Practice** (10-15 min) - students complete worksheet
7. **Closure** (5 min) - review and assessment check
8. **Differentiation** - modifications for different learners
9. **Assessment** - how to evaluate understanding

## HTML Format
- Self-contained HTML document
- Print-friendly styling
- Clear section headers
- Teacher notes in italics
- Time estimates for each section

Return ONLY valid HTML:`;
}
