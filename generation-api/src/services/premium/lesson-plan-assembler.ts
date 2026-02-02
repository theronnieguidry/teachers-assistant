/**
 * Lesson Plan Assembler Service
 *
 * Converts LessonPlanStructure to print-ready HTML documents.
 * Produces: Lesson Plan, Teacher Script, Materials List, Student Activity
 *
 * Issue #17: High-Quality Lesson Plan Generation
 */

import type {
  LessonPlanStructure,
  LessonPlanOutputs,
  LessonMetadata,
  LessonSection,
  TeacherScriptEntry,
  MaterialItem,
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

const LESSON_PLAN_STYLES = `
  ${BASE_STYLES}
  .lesson-header {
    border-bottom: 2px solid #1a365d;
    padding-bottom: 15px;
    margin-bottom: 25px;
  }
  .lesson-header h1 {
    text-align: center;
    font-size: 22px;
    color: #1a365d;
    margin-bottom: 10px;
  }
  .lesson-meta {
    text-align: center;
    color: #555;
    font-size: 14px;
  }
  .objective-box {
    background: #e8f4f8;
    border: 1px solid #bee3f8;
    padding: 15px;
    margin: 20px 0;
    border-radius: 4px;
  }
  .objective-box h3 {
    color: #2c5282;
    margin-bottom: 8px;
    font-size: 14px;
  }
  .objective-text {
    font-weight: bold;
    font-size: 16px;
  }
  .success-criteria {
    font-style: italic;
    color: #555;
    margin-top: 10px;
    font-size: 13px;
  }
  .section {
    margin-bottom: 25px;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }
  .section-header {
    background: #f7fafc;
    padding: 10px 15px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-header h2 {
    font-size: 16px;
    color: #2d3748;
    margin: 0;
  }
  .time-badge {
    background: #fef3c7;
    color: #92400e;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: bold;
  }
  .section-content {
    padding: 15px;
  }
  .activities-list {
    list-style-type: disc;
    margin-left: 20px;
    margin-top: 10px;
  }
  .activities-list li {
    margin-bottom: 6px;
  }
  .tip-box {
    background: #fffbeb;
    border-left: 3px solid #f59e0b;
    padding: 10px 15px;
    margin-top: 12px;
    font-size: 13px;
  }
  .tip-box strong {
    color: #b45309;
  }
  .script-callout {
    background: #f0fdf4;
    border: 1px solid #86efac;
    padding: 10px;
    margin-top: 10px;
    border-radius: 4px;
    font-size: 13px;
  }
  .script-callout strong {
    color: #166534;
  }
  .materials-section, .differentiation-section {
    margin-top: 25px;
    padding: 15px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
  }
  .materials-section h3, .differentiation-section h3 {
    margin-bottom: 12px;
    color: #374151;
    border-bottom: 1px solid #d1d5db;
    padding-bottom: 5px;
  }
  .diff-category {
    margin-bottom: 10px;
  }
  .diff-category strong {
    color: #374151;
  }
  .diff-category ul {
    margin-left: 20px;
    margin-top: 5px;
  }
`;

const TEACHER_SCRIPT_STYLES = `
  ${BASE_STYLES}
  .script-header {
    background: #166534;
    color: #fff;
    padding: 20px;
    margin: -40px -40px 25px -40px;
    text-align: center;
  }
  .script-header h1 {
    font-size: 24px;
    margin-bottom: 5px;
  }
  .script-header p {
    opacity: 0.9;
  }
  .intro-box {
    background: #f0fdf4;
    border: 1px solid #86efac;
    padding: 15px;
    margin-bottom: 25px;
    border-radius: 4px;
  }
  .intro-box h3 {
    color: #166534;
    margin-bottom: 8px;
  }
  .section {
    margin-bottom: 30px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    overflow: hidden;
  }
  .section-header {
    background: #f3f4f6;
    padding: 12px 15px;
    border-bottom: 1px solid #d1d5db;
  }
  .section-header h2 {
    font-size: 18px;
    color: #374151;
    margin: 0;
  }
  .section-header .time {
    color: #6b7280;
    font-size: 14px;
  }
  .section-content {
    padding: 15px;
  }
  .script-entry {
    margin-bottom: 15px;
    padding: 12px;
    border-radius: 4px;
  }
  .script-entry.say {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
  }
  .script-entry.do {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
  }
  .script-entry.if_struggle {
    background: #fce7f3;
    border-left: 4px solid #ec4899;
  }
  .script-entry.if_success {
    background: #d1fae5;
    border-left: 4px solid #10b981;
  }
  .script-label {
    font-weight: bold;
    font-size: 12px;
    text-transform: uppercase;
    margin-bottom: 5px;
  }
  .script-label.say { color: #1d4ed8; }
  .script-label.do { color: #b45309; }
  .script-label.if_struggle { color: #be185d; }
  .script-label.if_success { color: #047857; }
  .script-text {
    font-size: 15px;
    line-height: 1.6;
  }
  .quick-tip {
    background: #fffbeb;
    padding: 10px 15px;
    margin-top: 15px;
    border-radius: 4px;
    font-size: 13px;
  }
`;

const MATERIALS_LIST_STYLES = `
  ${BASE_STYLES}
  .materials-header {
    background: #7c3aed;
    color: #fff;
    padding: 20px;
    margin: -40px -40px 25px -40px;
    text-align: center;
  }
  .materials-header h1 {
    font-size: 24px;
    margin-bottom: 5px;
  }
  .materials-grid {
    display: grid;
    gap: 15px;
  }
  .material-card {
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    padding: 15px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .material-card.required {
    border-left: 4px solid #7c3aed;
  }
  .material-card.optional {
    border-left: 4px solid #9ca3af;
    background: #f9fafb;
  }
  .material-icon {
    font-size: 20px;
    width: 30px;
    text-align: center;
  }
  .material-details {
    flex: 1;
  }
  .material-name {
    font-weight: bold;
    font-size: 15px;
    color: #374151;
  }
  .material-quantity {
    color: #6b7280;
    font-size: 13px;
    margin-top: 3px;
  }
  .material-notes {
    font-style: italic;
    color: #9ca3af;
    font-size: 12px;
    margin-top: 5px;
  }
  .optional-badge {
    background: #f3f4f6;
    color: #6b7280;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 8px;
  }
  .prep-section {
    margin-top: 25px;
    padding: 15px;
    background: #fef3c7;
    border: 1px solid #fbbf24;
    border-radius: 4px;
  }
  .prep-section h3 {
    color: #92400e;
    margin-bottom: 10px;
  }
  .checklist {
    list-style: none;
    margin: 0;
  }
  .checklist li {
    padding: 5px 0;
    padding-left: 25px;
    position: relative;
  }
  .checklist li:before {
    content: "\\2610";
    position: absolute;
    left: 0;
    font-size: 16px;
  }
`;

// ============================================
// Helper Functions
// ============================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSectionIcon(type: string): string {
  const icons: Record<string, string> = {
    warmup: "&#9728;", // sun
    instruction: "&#128218;", // book
    guided_practice: "&#129309;", // handshake
    independent_practice: "&#9997;", // pencil
    check_understanding: "&#10067;", // question
    closure: "&#127919;", // star
    extension: "&#128640;", // rocket
  };
  return icons[type] || "&#8226;";
}

function getScriptActionLabel(action: string): string {
  const labels: Record<string, string> = {
    say: "Say this:",
    do: "Do this:",
    if_struggle: "If they struggle:",
    if_success: "If they get it:",
  };
  return labels[action] || action;
}

// ============================================
// HTML Generation Functions
// ============================================

/**
 * Build the main lesson plan HTML
 */
function buildLessonPlanHTML(plan: LessonPlanStructure): string {
  const { metadata, sections, materials, differentiation, accommodations } = plan;

  const sectionsHtml = sections
    .map((section) => {
      const activitiesHtml = section.activities
        .map((activity) => `<li>${escapeHtml(activity)}</li>`)
        .join("");

      const tipsHtml = section.tips
        ? section.tips
            .map((tip) => `<div class="tip-box"><strong>Tip:</strong> ${escapeHtml(tip)}</div>`)
            .join("")
        : "";

      // Add a brief script callout if teacher script exists
      const scriptCallout = section.teacherScript && section.teacherScript.length > 0
        ? `<div class="script-callout"><strong>See Teacher Script</strong> for detailed dialogue and prompts</div>`
        : "";

      return `
        <div class="section">
          <div class="section-header">
            <h2>${getSectionIcon(section.type)} ${escapeHtml(section.title)}</h2>
            <span class="time-badge">${section.durationMinutes} min</span>
          </div>
          <div class="section-content">
            <p>${escapeHtml(section.description)}</p>
            <ul class="activities-list">
              ${activitiesHtml}
            </ul>
            ${tipsHtml}
            ${scriptCallout}
          </div>
        </div>
      `;
    })
    .join("");

  const materialsHtml = materials
    .map((m) => `<li>${escapeHtml(m.name)}${m.quantity ? ` (${escapeHtml(m.quantity)})` : ""}${m.optional ? " <em>(optional)</em>" : ""}</li>`)
    .join("");

  const diffHtml = differentiation
    ? `
      <div class="differentiation-section">
        <h3>Differentiation Strategies</h3>
        <div class="diff-category">
          <strong>For Struggling Learners:</strong>
          <ul>${differentiation.forStruggling.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
        </div>
        <div class="diff-category">
          <strong>For Advanced Learners:</strong>
          <ul>${differentiation.forAdvanced.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
        </div>
        <div class="diff-category">
          <strong>For English Language Learners:</strong>
          <ul>${differentiation.forELL.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
        </div>
      </div>
    `
    : "";

  const accommodationsHtml = accommodations && accommodations.length > 0
    ? `<p style="margin-top: 15px;"><strong>Accommodations:</strong> ${accommodations.map(escapeHtml).join(", ")}</p>`
    : "";

  const priorKnowledgeHtml = metadata.priorKnowledge.length > 0
    ? `<p style="font-size: 13px; color: #555; margin-top: 8px;"><strong>Prior Knowledge:</strong> ${metadata.priorKnowledge.map(escapeHtml).join(", ")}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lesson Plan - ${escapeHtml(metadata.objective)}</title>
  <style>${LESSON_PLAN_STYLES}</style>
</head>
<body>
  <div class="lesson-header">
    <h1>Lesson Plan</h1>
    <div class="lesson-meta">
      Grade ${escapeHtml(String(metadata.grade))} | ${escapeHtml(metadata.subject)} | ${metadata.durationMinutes} minutes
    </div>
  </div>

  <div class="objective-box">
    <h3>Learning Objective</h3>
    <p class="objective-text">${escapeHtml(metadata.objective)}</p>
    <p class="success-criteria"><strong>Success looks like:</strong> ${escapeHtml(metadata.successCriteria)}</p>
    ${priorKnowledgeHtml}
  </div>

  ${sectionsHtml}

  <div class="materials-section">
    <h3>Materials Needed</h3>
    <ul class="activities-list">
      ${materialsHtml}
    </ul>
  </div>

  ${diffHtml}
  ${accommodationsHtml}
</body>
</html>`;
}

/**
 * Build the teacher script HTML (for novice mode)
 */
function buildTeacherScriptHTML(plan: LessonPlanStructure): string | null {
  // Check if any section has teacher script
  const hasScripts = plan.sections.some(
    (s) => s.teacherScript && s.teacherScript.length > 0
  );

  if (!hasScripts) {
    return null;
  }

  const sectionsHtml = plan.sections
    .map((section) => {
      if (!section.teacherScript || section.teacherScript.length === 0) {
        return "";
      }

      const scriptsHtml = section.teacherScript
        .map((entry) => {
          return `
            <div class="script-entry ${entry.action}">
              <div class="script-label ${entry.action}">${getScriptActionLabel(entry.action)}</div>
              <div class="script-text">${escapeHtml(entry.text)}</div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="section">
          <div class="section-header">
            <h2>${escapeHtml(section.title)}</h2>
            <span class="time">${section.durationMinutes} minutes</span>
          </div>
          <div class="section-content">
            ${scriptsHtml}
          </div>
        </div>
      `;
    })
    .filter((html) => html !== "")
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Teacher Script - ${escapeHtml(plan.metadata.objective)}</title>
  <style>${TEACHER_SCRIPT_STYLES}</style>
</head>
<body>
  <div class="script-header">
    <h1>Teacher Script</h1>
    <p>${escapeHtml(plan.metadata.objective)}</p>
  </div>

  <div class="intro-box">
    <h3>How to Use This Script</h3>
    <p>This script gives you exact words and actions for each part of the lesson. You don't need to follow it word-for-word, but it's there when you need it.</p>
    <ul style="margin-left: 20px; margin-top: 8px;">
      <li><strong style="color: #1d4ed8;">Say this:</strong> Words to speak to students</li>
      <li><strong style="color: #b45309;">Do this:</strong> Actions to take</li>
      <li><strong style="color: #be185d;">If they struggle:</strong> What to do when students need help</li>
      <li><strong style="color: #047857;">If they get it:</strong> How to respond to success</li>
    </ul>
  </div>

  ${sectionsHtml}

  <div class="quick-tip">
    <strong>Remember:</strong> Keep your voice calm and encouraging. It's okay to pause, breathe, and take your time. You've got this!
  </div>
</body>
</html>`;
}

/**
 * Build the materials list HTML
 */
function buildMaterialsListHTML(plan: LessonPlanStructure): string {
  const { metadata, materials } = plan;

  const requiredMaterials = materials.filter((m) => !m.optional);
  const optionalMaterials = materials.filter((m) => m.optional);

  const buildMaterialCard = (m: MaterialItem, isOptional: boolean) => `
    <div class="material-card ${isOptional ? "optional" : "required"}">
      <div class="material-icon">${isOptional ? "&#128300;" : "&#10004;"}</div>
      <div class="material-details">
        <div class="material-name">
          ${escapeHtml(m.name)}
          ${isOptional ? '<span class="optional-badge">Optional</span>' : ""}
        </div>
        ${m.quantity ? `<div class="material-quantity">${escapeHtml(m.quantity)}</div>` : ""}
        ${m.notes ? `<div class="material-notes">${escapeHtml(m.notes)}</div>` : ""}
      </div>
    </div>
  `;

  const requiredHtml = requiredMaterials.map((m) => buildMaterialCard(m, false)).join("");
  const optionalHtml = optionalMaterials.map((m) => buildMaterialCard(m, true)).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Materials List - ${escapeHtml(metadata.objective)}</title>
  <style>${MATERIALS_LIST_STYLES}</style>
</head>
<body>
  <div class="materials-header">
    <h1>Materials Checklist</h1>
    <p>${escapeHtml(metadata.objective)}</p>
  </div>

  ${requiredMaterials.length > 0 ? `
    <h2 style="margin-bottom: 15px; color: #374151;">Required Materials</h2>
    <div class="materials-grid">
      ${requiredHtml}
    </div>
  ` : ""}

  ${optionalMaterials.length > 0 ? `
    <h2 style="margin: 25px 0 15px 0; color: #6b7280;">Optional Materials</h2>
    <div class="materials-grid">
      ${optionalHtml}
    </div>
  ` : ""}

  <div class="prep-section">
    <h3>Pre-Lesson Prep Checklist</h3>
    <ul class="checklist">
      <li>Gather all required materials</li>
      <li>Review the lesson plan</li>
      <li>Prepare any visual aids</li>
      <li>Set up student workspace</li>
      <li>Have backup activities ready</li>
    </ul>
  </div>
</body>
</html>`;
}

// ============================================
// Main Assembly Function
// ============================================

/**
 * Assemble all lesson plan documents from the structured plan
 */
export function assembleLessonPlanOutputs(
  plan: LessonPlanStructure,
  includeTeacherScript: boolean = true
): LessonPlanOutputs {
  const lessonPlanHtml = buildLessonPlanHTML(plan);
  const teacherScriptHtml = includeTeacherScript ? buildTeacherScriptHTML(plan) : null;
  const materialsListHtml = buildMaterialsListHTML(plan);

  // For now, student activity is null - could be generated separately
  const studentActivityHtml = null;

  const lessonMetadata: LessonMetadata = {
    objective: plan.metadata.objective,
    lessonLength: plan.metadata.durationMinutes,
    teachingConfidence: includeTeacherScript ? "novice" : "intermediate",
    studentProfile: [],
    sectionsGenerated: plan.sections.map((s) => s.type),
  };

  return {
    lessonPlanHtml,
    teacherScriptHtml,
    materialsListHtml,
    studentActivityHtml,
    lessonMetadata,
  };
}

// ============================================
// Options-based API for generator.ts
// ============================================

interface AssembleOptions {
  includeTeacherScript?: boolean;
  includeStudentActivity?: boolean;
  includeMaterialsList?: boolean;
  includeTimingHints?: boolean;
}

/**
 * Assemble lesson plan HTML with options object API
 * (Wrapper for assembleLessonPlanOutputs for generator.ts compatibility)
 */
export function assembleLessonPlanHTML(
  plan: LessonPlanStructure,
  options: AssembleOptions = {}
): LessonPlanOutputs {
  const {
    includeTeacherScript = true,
    // Other options reserved for future use
  } = options;

  return assembleLessonPlanOutputs(plan, includeTeacherScript);
}

export {
  buildLessonPlanHTML,
  buildTeacherScriptHTML,
  buildMaterialsListHTML,
};
