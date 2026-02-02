# QA Knowledge Base

This file contains documented answers to QA questions for future reference. The QA agent should read this at the start of each session to avoid re-asking answered questions.

---

## Feature Decisions

*Documented decisions about how features should work.*

### 2026-01-25 - QA Test Account
**Decision**: Use dedicated test account for E2E testing
**Account**: `ronnie.guidry+ta@gmail.com` / `QaTest123!`
**Credits**: 50 (replenish via Supabase dashboard if needed)
**Action**: Documented in SKILL.md and e2e/qa-full-e2e.spec.ts

---

## UX Decisions

*Documented decisions about user experience and interface design.*

<!-- Template:
### [Date] - [UI Element/Flow]
**Observation**: [What QA noticed]
**User Response**: [Explanation or decision]
**Action**: Documented / Create Issue / No Action Needed
-->

---

## Known Limitations (Intentional)

*Features or behaviors that may seem like bugs but are intentional.*

### E2E Testing with Mock Auth
**Behavior**: E2E tests using mock auth can complete the full wizard UI flow but generation fails with JWT validation errors
**Reason**: The generation API independently validates JWTs with Supabase. Browser-level route mocking doesn't affect the API server's own requests.
**Workaround**: Direct API tests verify actual AI provider functionality. For full E2E, use real Supabase credentials.
**Documented**: 2026-01-25

---

## Bugs Fixed

*History of bugs found and fixed during QA sessions.*

### 2026-01-26 - Infinite Loop in TodayView Component (P0)
**Symptom**: App crashed immediately after login with "Maximum update depth exceeded" error
**Root Cause**: Zustand store had "computed helper" methods (getActiveProfile, getNextRecommendedObjective, getAllSubjectProgress) that were being called as selectors. These returned new object/array references on every render, violating React 18's useSyncExternalStore requirements.
**Fix**: Changed components to select raw state values and compute derived values with `useMemo()`. Also fixed convenience selector hooks in learnerStore.ts.
**Files Changed**:
- `src/components/learning-path/TodayView.tsx`
- `src/components/learning-path/LearningPathView.tsx`
- `src/components/learning-path/ObjectiveCard.tsx`
- `src/stores/learnerStore.ts`

### 2026-01-26 - Wizard Dialog Content Outside Viewport (P1)
**Symptom**: "Next" button in wizard step 1 was inaccessible because dialog content extended beyond the viewport
**Root Cause**: WizardDialog.tsx had `min-h-[500px]` but no max-height constraint. The ClassDetailsStep grew taller with the addition of ObjectiveChooser, lesson plan options, and student profile flags.
**Fix**: Added `max-h-[90vh]` and `overflow-y-auto` to allow scrolling within the dialog.
**Files Changed**: `src/components/wizard/WizardDialog.tsx`

---

## Future Enhancement Ideas

*Ideas noted during QA that aren't bugs but could improve the app.*

<!-- Template:
### [Idea Title]
**Description**: [What could be added/improved]
**Noted**: [Date]
**Status**: Noted / Issue Created (#number) / Implemented
-->

---

## Session History

| Date | Bugs Found | Bugs Fixed | Questions Asked | Notes |
|------|------------|------------|-----------------|-------|
| 2026-01-26 | 2 | 2 | 0 | Fixed P0 infinite loop in TodayView (Zustand selector issue) and wizard dialog overflow |
| 2026-01-25 | 1 | 1 | 0 | Full E2E with real auth: All 3 providers generated successfully, credits bug fixed |

