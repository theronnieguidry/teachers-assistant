/**
 * Lesson Plan Planner Service
 *
 * Creates structured LessonPlanStructure JSON from a teacher's prompt.
 * This is the first stage of the premium lesson plan pipeline.
 *
 * Issue #17: High-Quality Lesson Plan Generation
 */

import { generateContent, type AIProviderConfig } from "../ai-provider.js";
import type {
  LessonPlanStructure,
  LessonPlanContext,
  LessonSectionType,
} from "../../types/premium.js";

export interface LessonPlannerResult {
  plan: LessonPlanStructure;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Parse JSON from AI response, handling common formatting issues
 */
function parseJsonResponse(content: string): LessonPlanStructure {
  // Remove markdown code block wrappers if present
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as LessonPlanStructure;
  } catch (error) {
    // Try to extract JSON from the response if it contains extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as LessonPlanStructure;
      } catch {
        // Fall through to error
      }
    }
    throw new Error(
      `Failed to parse lesson plan JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate basic plan structure before returning
 */
function validateBasicStructure(plan: LessonPlanStructure): void {
  if (!plan.version) {
    throw new Error("Plan missing version field");
  }
  if (!plan.metadata?.objective) {
    throw new Error("Plan missing metadata.objective");
  }
  if (!plan.metadata?.grade) {
    throw new Error("Plan missing metadata.grade");
  }
  if (!plan.sections || plan.sections.length === 0) {
    throw new Error("Plan missing sections");
  }
  if (!plan.materials) {
    throw new Error("Plan missing materials list");
  }

  // Check required section types
  const requiredSections: LessonSectionType[] = [
    "warmup",
    "instruction",
    "guided_practice",
    "independent_practice",
    "closure",
  ];

  const presentSections = plan.sections.map((s) => s.type);
  for (const required of requiredSections) {
    if (!presentSections.includes(required)) {
      throw new Error(`Plan missing required section: ${required}`);
    }
  }

  // Check that sections have valid structure
  for (const section of plan.sections) {
    if (!section.type || !section.title || section.durationMinutes === undefined) {
      throw new Error(
        `Section missing required fields (type, title, durationMinutes)`
      );
    }
    if (!section.activities || section.activities.length === 0) {
      throw new Error(`Section ${section.type} has no activities`);
    }
  }
}

/**
 * Get total duration from all sections
 */
export function getTotalDuration(plan: LessonPlanStructure): number {
  return plan.sections.reduce((total, section) => total + section.durationMinutes, 0);
}

/**
 * Build the prompt for lesson plan generation
 */
function buildLessonPlanPrompt(context: LessonPlanContext): string {
  const gradePedagogy = getGradePedagogy(context.grade);
  const studentProfileText = context.studentProfile.length > 0
    ? `Student needs: ${context.studentProfile.join(", ")}`
    : "General class with varied abilities";

  const includeTeacherScript = context.teachingConfidence === "novice";

  return `You are an expert elementary school curriculum designer creating a high-quality lesson plan.

## Task
Create a structured lesson plan in JSON format for:
- Topic: ${context.prompt}
- Grade: ${context.grade}
- Subject: ${context.subject}
- Duration: ${context.lessonLength} minutes
- Teaching experience: ${context.teachingConfidence}
- ${studentProfileText}

## Grade ${context.grade} Pedagogy Guidelines
${gradePedagogy}

## Required Sections
Each section must include a type, title, durationMinutes, description, and activities array.
${includeTeacherScript ? "IMPORTANT: Include detailed teacherScript entries for EVERY section." : ""}

1. **warmup** (3-5 min) - Quick confidence boost, activate prior knowledge
2. **instruction** (5-10 min) - Clear explanation with examples
3. **guided_practice** (5-10 min) - 2-3 examples together with prompts
4. **independent_practice** (10-15 min) - Worksheet or hands-on activity
5. **check_understanding** (2-5 min) - 3 quick questions with remediation guidance
6. **closure** (2-3 min) - Summary of what was learned
7. **extension** (optional) - Challenge and fun options

${includeTeacherScript ? `
## Teacher Script Requirements (REQUIRED)
For EVERY section, include detailed teacherScript array with entries like:
- { "action": "say", "text": "Exact words to say" }
- { "action": "do", "text": "Physical demonstration or action" }
- { "action": "if_struggle", "text": "What to do if students struggle" }
- { "action": "if_success", "text": "How to respond when students succeed" }

Include tone coaching: "Keep voice calm and encouraging"
Include pacing hints: "Pause 3 seconds for students to think"
` : ""}

## Materials List
Include all needed materials with optional flag for non-essential items.

## Differentiation
Include specific strategies for:
- forStruggling: Students who need extra support
- forAdvanced: Students ready for challenge
- forELL: English language learners

## JSON Schema
Return ONLY valid JSON matching this structure:
{
  "version": "1.0",
  "metadata": {
    "objective": "Single clear learning objective",
    "grade": "${context.grade}",
    "subject": "${context.subject}",
    "durationMinutes": ${context.lessonLength},
    "priorKnowledge": ["What students should already know"],
    "successCriteria": "How to know if students learned"
  },
  "sections": [
    {
      "type": "warmup",
      "title": "Section title",
      "durationMinutes": 5,
      "description": "What happens in this section",
      "teacherScript": [{"action": "say", "text": "..."}],
      "activities": ["Activity 1", "Activity 2"],
      "tips": ["Helpful teaching tip"]
    }
  ],
  "materials": [
    {"name": "Paper", "quantity": "1 per student", "optional": false},
    {"name": "Crayons", "optional": true, "notes": "For extension activity"}
  ],
  "differentiation": {
    "forStruggling": ["Use manipulatives", "Pair with helper"],
    "forAdvanced": ["Add challenge problems"],
    "forELL": ["Pre-teach vocabulary", "Use visuals"]
  },
  "accommodations": ["Movement break after 15 min", "Visual timer"]
}

Return ONLY valid JSON. Do NOT wrap in markdown code blocks.`;
}

/**
 * Grade-specific pedagogy guidelines
 */
function getGradePedagogy(grade: string): string {
  const guidelines: Record<string, string> = {
    K: `
- Minimal reading required - use visuals and verbal instructions
- Keep activities to 5-10 minutes max before switching
- Use songs, movement, and hands-on manipulatives
- Repeat instructions 2-3 times using different words
- Counting, letters, shapes, patterns, basic sorting
- Lots of praise and encouragement`,
    "1": `
- Short sentences with early phonics words
- Addition/subtraction within 20
- Concrete examples with pictures
- 10-15 minute attention spans
- Use partner work and movement
- Build on Kindergarten foundations`,
    "2": `
- Place value to 100
- Simple word problems
- Short paragraph reading comprehension
- Can follow 2-3 step directions
- Beginning independent work time
- Introduce basic problem-solving strategies`,
    "3": `
- Multiplication basics (facts to 10)
- Short inference in reading
- Longer independent practice (15-20 min)
- Can take simple notes
- Beginning paragraph writing
- More abstract concepts with concrete support`,
    "4": `
- Multi-digit operations
- Multi-paragraph reading
- 20-25 minute independent work
- Can handle more complex directions
- Introduction to note-taking strategies
- Beginning research skills`,
    "5": `
- Fractions and decimals
- Longer text comprehension
- Independent work up to 30 minutes
- Can self-correct with guidance
- Essay writing introduction
- Critical thinking questions`,
    "6": `
- Ratios and percentages
- Complex text analysis
- Extended independent work
- Self-directed learning activities
- Multi-paragraph essays
- Higher-order thinking skills`,
  };

  return guidelines[grade] || guidelines["3"];
}

/**
 * Create a lesson plan from the generation context
 */
export async function createLessonPlan(
  context: LessonPlanContext,
  aiConfig: AIProviderConfig
): Promise<LessonPlannerResult> {
  const prompt = buildLessonPlanPrompt(context);

  console.log(
    `[lesson-plan-planner] Creating plan for Grade ${context.grade} ${context.subject}, ${context.lessonLength} min`
  );
  const startTime = Date.now();

  const response = await generateContent(prompt, {
    ...aiConfig,
    maxTokens: 6000, // Lesson plans are typically larger than worksheets
  });

  console.log(
    `[lesson-plan-planner] AI response received in ${Date.now() - startTime}ms`
  );

  // Parse and validate the JSON response
  const plan = parseJsonResponse(response.content);

  // Basic structural validation
  validateBasicStructure(plan);

  // Ensure metadata matches context
  plan.metadata.grade = context.grade;
  plan.metadata.subject = context.subject;
  plan.metadata.durationMinutes = context.lessonLength;

  const totalDuration = getTotalDuration(plan);
  console.log(
    `[lesson-plan-planner] Plan created: "${plan.metadata.objective}" with ${plan.sections.length} sections (${totalDuration} min)`
  );

  return {
    plan,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };
}

/**
 * Create a simple fallback plan when AI generation fails
 * This ensures we never leave the user without output
 */
export function createFallbackLessonPlan(
  context: LessonPlanContext
): LessonPlanStructure {
  return {
    version: "1.0",
    metadata: {
      objective: `Learn about ${context.prompt}`,
      grade: context.grade,
      subject: context.subject,
      durationMinutes: context.lessonLength,
      priorKnowledge: ["Basic grade-level skills"],
      successCriteria: "Students can demonstrate understanding of the concept",
    },
    sections: [
      {
        type: "warmup",
        title: "Warm-Up",
        durationMinutes: 5,
        description: "Quick review to activate prior knowledge",
        activities: ["Review previous lesson briefly", "Ask opening question"],
      },
      {
        type: "instruction",
        title: "Direct Instruction",
        durationMinutes: 10,
        description: "Introduce the new concept",
        activities: ["Explain the concept", "Show examples", "Check for understanding"],
      },
      {
        type: "guided_practice",
        title: "Guided Practice",
        durationMinutes: 10,
        description: "Practice together as a class",
        activities: ["Work through 2-3 examples together", "Ask guiding questions"],
      },
      {
        type: "independent_practice",
        title: "Independent Practice",
        durationMinutes: Math.max(10, context.lessonLength - 30),
        description: "Students work independently",
        activities: ["Complete practice problems", "Ask for help if needed"],
      },
      {
        type: "closure",
        title: "Closure",
        durationMinutes: 5,
        description: "Wrap up the lesson",
        activities: ["Summarize what was learned", "Preview next lesson"],
      },
    ],
    materials: [
      { name: "Pencil", optional: false },
      { name: "Paper", optional: false },
      { name: "Worksheet", optional: false, notes: "If applicable" },
    ],
    differentiation: {
      forStruggling: ["Provide additional support", "Use manipulatives"],
      forAdvanced: ["Provide challenge problems"],
      forELL: ["Use visuals and gestures", "Pre-teach vocabulary"],
    },
    accommodations: [],
  };
}
