/**
 * HTML Assembler Service
 *
 * Converts WorksheetPlan to print-ready HTML.
 * This produces deterministic, high-quality output from the structured plan.
 */

import type {
  WorksheetPlan,
  WorksheetSection,
  WorksheetItem,
  ImageResult,
  VisualStyle,
} from "../../types/premium.js";

// ============================================
// CSS Templates
// ============================================

const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 40px;
  }
  @media print {
    body { padding: 20px; margin: 0; }
    .page-break { page-break-before: always; }
  }
`;

const WORKSHEET_STYLES = `
  ${BASE_STYLES}
  .worksheet-header {
    border-bottom: 2px solid #000;
    padding-bottom: 15px;
    margin-bottom: 25px;
  }
  .worksheet-header h1 {
    text-align: center;
    font-size: 24px;
    margin-bottom: 15px;
  }
  .student-info {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
  }
  .instructions {
    background: #f9f9f9;
    border: 1px solid #ddd;
    padding: 12px 15px;
    margin-bottom: 25px;
    font-style: italic;
  }
  .section {
    margin-bottom: 30px;
  }
  .section-title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 15px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 5px;
  }
  .question {
    margin-bottom: 25px;
    line-height: 1.8;
  }
  .question-number {
    font-weight: bold;
    margin-right: 8px;
  }
  .options {
    margin-top: 10px;
    margin-left: 25px;
  }
  .option {
    margin-bottom: 8px;
  }
  .answer-line {
    display: inline-block;
    border-bottom: 1px solid #000;
    min-width: 100px;
    margin-left: 5px;
  }
  .visual-placeholder {
    background: #f0f0f0;
    border: 2px dashed #ccc;
    padding: 20px;
    text-align: center;
    margin: 15px 0;
    color: #666;
    font-style: italic;
  }
  .worksheet-image {
    display: block;
    margin: 15px auto;
  }
  .img-small {
    max-width: 150px;
    max-height: 150px;
  }
  .img-medium {
    max-width: 300px;
    max-height: 225px;
  }
  .img-wide {
    max-width: 100%;
    max-height: 200px;
  }
  .img-large {
    max-width: 300px;
    max-height: 225px;
  }
  .word-bank {
    background: #f5f5f5;
    border: 1px solid #ccc;
    padding: 15px;
    margin-bottom: 20px;
  }
  .word-bank-title {
    font-weight: bold;
    margin-bottom: 10px;
  }
  .word-bank-items {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
  }
  .matching-item {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
  }
  .matching-left {
    flex: 1;
  }
  .matching-line {
    width: 50px;
    border-bottom: 1px solid #000;
    margin: 0 15px;
  }
  .matching-right {
    flex: 1;
  }
  .true-false-options {
    margin-left: 25px;
    margin-top: 10px;
  }
  .true-false-option {
    margin-right: 30px;
    display: inline-block;
  }
`;

const ANSWER_KEY_STYLES = `
  ${BASE_STYLES}
  .answer-key-header {
    background: #2d6a4f;
    color: #fff;
    padding: 15px;
    text-align: center;
    margin-bottom: 25px;
  }
  .answer-key-header h1 {
    font-size: 22px;
    margin: 0;
  }
  .answer-item {
    margin-bottom: 20px;
    padding: 10px;
    border-left: 3px solid #2d6a4f;
    background: #f8f8f8;
  }
  .answer-number {
    font-weight: bold;
    color: #2d6a4f;
  }
  .answer-text {
    font-weight: bold;
    margin: 5px 0;
  }
  .answer-explanation {
    font-style: italic;
    color: #555;
    font-size: 13px;
  }
  .scoring-guide {
    margin-top: 30px;
    padding: 15px;
    background: #e8f5e9;
    border: 1px solid #a5d6a7;
  }
  .scoring-guide h3 {
    margin-bottom: 10px;
  }
`;

const LESSON_PLAN_STYLES = `
  ${BASE_STYLES}
  .lesson-header {
    border-bottom: 2px solid #000;
    padding-bottom: 15px;
    margin-bottom: 25px;
  }
  .lesson-header h1 {
    text-align: center;
    font-size: 22px;
    margin-bottom: 10px;
  }
  .lesson-meta {
    text-align: center;
    color: #555;
  }
  .lesson-section {
    margin-bottom: 25px;
  }
  .lesson-section h2 {
    background: #f5f5f5;
    padding: 8px 12px;
    margin-bottom: 15px;
    border-left: 4px solid #333;
  }
  .time-estimate {
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
  }
  .materials-list {
    list-style-type: disc;
    margin-left: 25px;
  }
  .objectives-list {
    list-style-type: none;
    margin-left: 15px;
  }
  .objectives-list li:before {
    content: "\\2713 ";
    color: #2d6a4f;
    font-weight: bold;
  }
  .teacher-note {
    border-left: 3px solid #666;
    padding-left: 15px;
    font-style: italic;
    margin: 15px 0;
    color: #444;
  }
`;

// ============================================
// HTML Generation Functions
// ============================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderQuestionContent(item: WorksheetItem): string {
  const escapedQuestion = escapeHtml(item.questionText);

  switch (item.questionType) {
    case "multiple_choice":
      return `
        <div class="question">
          <span class="question-number">${item.id.replace("q", "")}.</span>
          ${escapedQuestion}
          <div class="options">
            ${(item.options || [])
              .map((opt) => `<div class="option">${escapeHtml(opt)}</div>`)
              .join("")}
          </div>
        </div>`;

    case "true_false":
      return `
        <div class="question">
          <span class="question-number">${item.id.replace("q", "")}.</span>
          ${escapedQuestion}
          <div class="true-false-options">
            <span class="true-false-option">&#9675; True</span>
            <span class="true-false-option">&#9675; False</span>
          </div>
        </div>`;

    case "fill_blank":
      return `
        <div class="question">
          <span class="question-number">${item.id.replace("q", "")}.</span>
          ${escapedQuestion.replace(/_{3,}/g, '<span class="answer-line">&nbsp;</span>')}
        </div>`;

    case "matching":
      return `
        <div class="question matching-item">
          <span class="question-number">${item.id.replace("q", "")}.</span>
          <span class="matching-left">${escapedQuestion}</span>
          <span class="matching-line"></span>
          <span class="matching-right">_______</span>
        </div>`;

    case "word_problem":
    case "short_answer":
    default:
      return `
        <div class="question">
          <span class="question-number">${item.id.replace("q", "")}.</span>
          ${escapedQuestion}
          <div style="margin-top: 15px; border-bottom: 1px solid #ccc; height: 30px;"></div>
        </div>`;
  }
}

interface ImageWithSize extends ImageResult {
  size?: string;
}

function renderSection(
  section: WorksheetSection,
  images: Map<string, ImageWithSize>
): string {
  const items = section.items
    .map((item) => {
      let html = "";

      // Add image before question if there's a visual placement for it
      const image = images.get(item.id);
      if (image) {
        // Determine size class from image metadata or default to medium
        const sizeClass = image.size ? `img-${image.size}` : "img-medium";
        html += `<img class="worksheet-image ${sizeClass}" src="data:${image.mediaType};base64,${image.base64Data}" alt="Illustration" />`;
      }

      html += renderQuestionContent(item);
      return html;
    })
    .join("");

  return `
    <div class="section">
      ${section.title ? `<div class="section-title">${escapeHtml(section.title)}</div>` : ""}
      ${section.instructions ? `<p style="margin-bottom: 15px;">${escapeHtml(section.instructions)}</p>` : ""}
      ${items}
    </div>`;
}

// ============================================
// Main Assembly Functions
// ============================================

export interface AssemblyResult {
  worksheetHtml: string;
  answerKeyHtml: string;
  lessonPlanHtml: string;
}

/**
 * Assemble worksheet HTML from plan
 */
export function assembleWorksheet(
  plan: WorksheetPlan,
  images: ImageResult[] = []
): string {
  // Create a map of images by placement ID, including size info
  const imageMap = new Map<string, ImageWithSize>();

  // Map images to placements
  if (plan.visualPlacements) {
    for (let i = 0; i < plan.visualPlacements.length; i++) {
      const placement = plan.visualPlacements[i];
      const image = images[i];

      if (image && placement) {
        // Attach size info from placement to the image
        imageMap.set(placement.afterItemId, {
          ...image,
          size: placement.size,
        });
      }
    }
  }

  // Also check for images that have placementId set directly
  for (const image of images) {
    if (image.placementId && !imageMap.has(image.placementId)) {
      // Find the placement to get size info
      const placement = plan.visualPlacements?.find(
        (p) => p.afterItemId === image.placementId
      );
      imageMap.set(image.placementId, {
        ...image,
        size: placement?.size || "medium",
      });
    }
  }

  const sections = plan.structure.sections
    .map((s) => renderSection(s, imageMap))
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(plan.metadata.title)}</title>
  <style>${WORKSHEET_STYLES}</style>
</head>
<body>
  <div class="worksheet-header">
    <h1>${escapeHtml(plan.structure.header.title)}</h1>
    <div class="student-info">
      ${plan.structure.header.hasNameLine ? "<span>Name: _______________________</span>" : ""}
      ${plan.structure.header.hasDateLine ? "<span>Date: _______________</span>" : ""}
    </div>
  </div>

  <div class="instructions">
    ${escapeHtml(plan.structure.header.instructions)}
  </div>

  ${sections}
</body>
</html>`;
}

/**
 * Assemble answer key HTML from plan
 */
export function assembleAnswerKey(plan: WorksheetPlan): string {
  const answers = plan.structure.sections
    .flatMap((section) =>
      section.items.map(
        (item) => `
      <div class="answer-item">
        <span class="answer-number">${item.id.replace("q", "")}.</span>
        <div class="answer-text">${escapeHtml(item.correctAnswer)}</div>
        ${item.explanation ? `<div class="answer-explanation">${escapeHtml(item.explanation)}</div>` : ""}
      </div>`
      )
    )
    .join("");

  const totalPoints =
    plan.structure.sections.reduce(
      (total, section) =>
        total +
        section.items.reduce((sum, item) => sum + (item.points || 1), 0),
      0
    ) || plan.structure.sections.reduce((t, s) => t + s.items.length, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(plan.metadata.title)} - Answer Key</title>
  <style>${ANSWER_KEY_STYLES}</style>
</head>
<body>
  <div class="answer-key-header">
    <h1>ANSWER KEY</h1>
    <p>${escapeHtml(plan.metadata.title)}</p>
  </div>

  ${answers}

  <div class="scoring-guide">
    <h3>Scoring Guide</h3>
    <p>Total possible points: <strong>${totalPoints}</strong></p>
    <p>90-100%: Excellent | 80-89%: Good | 70-79%: Satisfactory | Below 70%: Needs Review</p>
  </div>
</body>
</html>`;
}

/**
 * Assemble lesson plan HTML from plan
 */
export function assembleLessonPlan(plan: WorksheetPlan): string {
  const objectives = plan.metadata.learningObjectives
    .map((obj) => `<li>${escapeHtml(obj)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(plan.metadata.title)} - Lesson Plan</title>
  <style>${LESSON_PLAN_STYLES}</style>
</head>
<body>
  <div class="lesson-header">
    <h1>${escapeHtml(plan.metadata.title)}</h1>
    <div class="lesson-meta">
      Grade ${plan.metadata.grade} | ${escapeHtml(plan.metadata.subject)} | ${escapeHtml(plan.metadata.estimatedTime)}
    </div>
  </div>

  <div class="lesson-section">
    <h2>Learning Objectives</h2>
    <ul class="objectives-list">
      ${objectives}
    </ul>
  </div>

  <div class="lesson-section">
    <h2>Materials Needed</h2>
    <ul class="materials-list">
      <li>Copies of worksheet (one per student)</li>
      <li>Pencils</li>
      <li>Whiteboard/markers for demonstration</li>
    </ul>
  </div>

  <div class="lesson-section">
    <h2>Warm-Up Activity</h2>
    <div class="time-estimate">(5-10 minutes)</div>
    <p>Begin with a quick review of prerequisite skills. Ask students to share what they already know about ${escapeHtml(plan.metadata.topic)}.</p>
  </div>

  <div class="lesson-section">
    <h2>Direct Instruction</h2>
    <div class="time-estimate">(15-20 minutes)</div>
    <p>Introduce the main concepts covered in this worksheet. Use the whiteboard to demonstrate examples similar to the worksheet problems.</p>
    <div class="teacher-note">Tip: Check for understanding frequently by asking students to show thumbs up/down.</div>
  </div>

  <div class="lesson-section">
    <h2>Guided Practice</h2>
    <div class="time-estimate">(10-15 minutes)</div>
    <p>Work through the first few problems together as a class. Allow students to discuss their thinking with partners.</p>
  </div>

  <div class="lesson-section">
    <h2>Independent Practice</h2>
    <div class="time-estimate">(10-15 minutes)</div>
    <p>Distribute worksheets. Students complete remaining problems independently. Circulate to provide support as needed.</p>
  </div>

  <div class="lesson-section">
    <h2>Closure</h2>
    <div class="time-estimate">(5 minutes)</div>
    <p>Review key concepts. Have students share one thing they learned. Collect worksheets for assessment.</p>
  </div>

  <div class="lesson-section">
    <h2>Differentiation</h2>
    <ul class="materials-list">
      <li><strong>For struggling learners:</strong> Provide manipulatives, allow partner work, reduce problem count</li>
      <li><strong>For advanced learners:</strong> Add challenge problems, ask for explanations of reasoning</li>
    </ul>
  </div>

  <div class="lesson-section">
    <h2>Assessment</h2>
    <p>Evaluate student worksheets using the answer key. Look for common misconceptions to address in future lessons.</p>
  </div>
</body>
</html>`;
}

/**
 * Assemble all documents from a plan
 */
export function assembleAll(
  plan: WorksheetPlan,
  options: {
    includeAnswerKey: boolean;
    includeLessonPlan: boolean;
    images?: ImageResult[];
  }
): AssemblyResult {
  return {
    worksheetHtml: assembleWorksheet(plan, options.images),
    answerKeyHtml: options.includeAnswerKey ? assembleAnswerKey(plan) : "",
    lessonPlanHtml: options.includeLessonPlan ? assembleLessonPlan(plan) : "",
  };
}
