# TA (Teacher's Assistant) - QA Testing Plan

## Overview

This document tracks the comprehensive QA testing status for the TA desktop application. It is automatically updated by the `/qa` skill and should be updated manually when new features are added.

---

## Test Environment

- **Frontend**: React + TypeScript + Vite (localhost:1420)
- **Backend API**: Node.js + Express (localhost:3001)
- **Database**: Supabase (test environment)
- **E2E Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit

---

## Test Summary

### Latest Run: 2026-01-24 (Updated)

| Metric | Value |
|--------|-------|
| Unit Tests (Frontend) | 388 ✅ |
| Unit Tests (API) | 106 ✅ |
| E2E Tests | 177 ✅ (59 × 3 browsers) |
| **Total** | **671** |
| **Pass Rate** | **100%** |

---

## Test Categories

### 1. Authentication Tests (`e2e/auth.spec.ts`)

| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|:--------:|:-------:|:------:|-------|
| AUTH-001 | Login form displays correctly | ✅ | ✅ | ✅ | |
| AUTH-002 | Signup link visible | ✅ | ✅ | ✅ | |
| AUTH-003 | Form requires valid input | ✅ | ✅ | ✅ | |
| AUTH-004 | Toggle to signup form | ✅ | ✅ | ✅ | |
| AUTH-005 | Signup password confirmation | ✅ | ✅ | ✅ | |
| AUTH-006 | Trial credits banner on signup | ✅ | ✅ | ✅ | |
| AUTH-007 | Password field is masked | ✅ | ✅ | ✅ | |
| AUTH-008 | Switch back to login | ✅ | ✅ | ✅ | |
| AUTH-009 | Google sign in button on login | ✅ | ✅ | ✅ | OAuth |
| AUTH-010 | Apple sign in button on login | ✅ | ✅ | ✅ | OAuth |
| AUTH-011 | OAuth buttons on signup | ✅ | ✅ | ✅ | OAuth |
| AUTH-012 | 'Or continue with email' divider | ✅ | ✅ | ✅ | OAuth |

### 2. Dashboard Tests (`e2e/dashboard.spec.ts`)

| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|:--------:|:-------:|:------:|-------|
| DASH-001 | Main content area renders | ✅ | ✅ | ✅ | |
| DASH-002 | Creation panel with textarea | ✅ | ✅ | ✅ | |
| DASH-003 | Create button visible | ✅ | ✅ | ✅ | |
| DASH-004 | Create button disabled for short prompts | ✅ | ✅ | ✅ | |
| DASH-005 | Create button enabled for valid prompts | ✅ | ✅ | ✅ | |
| DASH-006 | Projects panel visible | ✅ | ✅ | ✅ | |
| DASH-007 | Inspiration panel visible | ✅ | ✅ | ✅ | |
| DASH-008 | Header with user info | ✅ | ✅ | ✅ | |

### 3. Creation Wizard Tests (`e2e/wizard.spec.ts`)

| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|:--------:|:-------:|:------:|-------|
| WIZ-001 | Wizard opens on Create click | ✅ | ✅ | ✅ | |
| WIZ-002 | Progress indicator with step labels | ✅ | ✅ | ✅ | |
| WIZ-003 | Step 1 shows all form fields | ✅ | ✅ | ✅ | |
| WIZ-004 | Project title field visible | ✅ | ✅ | ✅ | |
| WIZ-005 | Next button on step 1 | ✅ | ✅ | ✅ | |
| WIZ-006 | Next advances to step 2 | ✅ | ✅ | ✅ | |
| WIZ-007 | Step 2 shows Back button | ✅ | ✅ | ✅ | |
| WIZ-008 | Back returns to step 1 | ✅ | ✅ | ✅ | |
| WIZ-009 | Close wizard via close button | ✅ | ✅ | ✅ | |
| WIZ-010 | Step 2 shows Skip button | ✅ | ✅ | ✅ | |
| WIZ-011 | Step 3 shows AI provider selection | ✅ | ✅ | ✅ | |
| WIZ-012 | Claude is selected by default | ✅ | ✅ | ✅ | |
| WIZ-013 | Can select different provider | ✅ | ✅ | ✅ | |
| WIZ-014 | Recommended badge on Claude | ✅ | ✅ | ✅ | |

### 4. Inspiration Panel Tests (`e2e/inspiration.spec.ts`)

| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|:--------:|:-------:|:------:|-------|
| INSP-001 | Panel title visible | ✅ | ✅ | ✅ | |
| INSP-002 | Add URL button visible | ✅ | ✅ | ✅ | |
| INSP-003 | Drop zone area visible | ✅ | ✅ | ✅ | |
| INSP-004 | Empty state initially | ✅ | ✅ | ✅ | |
| INSP-005 | Add URL opens prompt | ✅ | ✅ | ✅ | |
| INSP-006 | Can enter URL and see in list | ✅ | ✅ | ✅ | |
| INSP-007 | Can remove inspiration item | ✅ | ✅ | ✅ | |
| INSP-008 | Item count updates | ✅ | ✅ | ✅ | |
| INSP-009 | Dismiss prompt doesn't add item | ✅ | ✅ | ✅ | |
| INSP-010 | Drop more files text after adding | ✅ | ✅ | ✅ | |

### 5. Projects Panel Tests (`e2e/projects.spec.ts`)

| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|:--------:|:-------:|:------:|-------|
| PROJ-001 | Panel title visible | ✅ | ✅ | ✅ | |
| PROJ-002 | Refresh button with icon | ✅ | ✅ | ✅ | |
| PROJ-003 | Empty state when no projects | ✅ | ✅ | ✅ | 15s timeout for Firefox |
| PROJ-004 | Refresh button clickable | ✅ | ✅ | ✅ | |
| PROJ-005 | Regenerate button opens wizard with pre-filled data | ✅ | ✅ | ✅ | |
| PROJ-006 | Open folder button opens output folder | ⏳ | ⏳ | ⏳ | Tauri only |
| PROJ-007 | Duplicate button creates project copy | ✅ | ✅ | ✅ | |
| PROJ-008 | Delete button removes project | ⏳ | ⏳ | ⏳ | Existing |
| PROJ-009 | Project action buttons show on hover | ✅ | ✅ | ✅ | |

### 6. Accessibility Tests (`e2e/accessibility.spec.ts`)

| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|:--------:|:-------:|:------:|-------|
| A11Y-001 | Form elements have labels | ✅ | ✅ | ✅ | Unauthenticated |
| A11Y-002 | Buttons have accessible names | ✅ | ✅ | ✅ | Unauthenticated |
| A11Y-003 | Title text present | ✅ | ✅ | ✅ | Unauthenticated |
| A11Y-004 | Keyboard navigation works | ✅ | ✅ | ✅ | Unauthenticated |
| A11Y-005 | Page has main landmark | ✅ | ✅ | ✅ | Authenticated |
| A11Y-006 | Dialog has proper role | ✅ | ✅ | ✅ | Authenticated |
| A11Y-007 | Interactive elements focusable | ✅ | ✅ | ✅ | Authenticated |
| A11Y-008 | Focus is visible | ✅ | ✅ | ✅ | Authenticated |

### 7. Project Regeneration Tests (Unit: `wizardStore.test.ts`)

| Test ID | Description | Status | Notes |
|---------|-------------|:------:|-------|
| REGEN-001 | openWizardForRegeneration sets regeneratingProjectId | ⏳ | New |
| REGEN-002 | Wizard pre-fills prompt from existing project | ⏳ | New |
| REGEN-003 | Wizard pre-fills classDetails from existing project | ⏳ | New |
| REGEN-004 | Wizard pre-fills inspiration from existing project | ⏳ | New |
| REGEN-005 | Wizard pre-fills outputPath from existing project | ⏳ | New |
| REGEN-006 | GenerationStep skips createProject when regenerating | ⏳ | New |
| REGEN-007 | GenerationStep uses existing projectId for API call | ⏳ | New |
| REGEN-008 | reset() clears regeneratingProjectId | ⏳ | New |
| REGEN-009 | openWizard() sets regeneratingProjectId to null | ⏳ | New |

### 8. AI Provider Selection Tests (Unit: `ProviderSelector.test.tsx`)

| Test ID | Description | Status | Notes |
|---------|-------------|:------:|-------|
| TC-PROV-001 | Renders all three provider options | ⏳ | Issue #8 |
| TC-PROV-002 | Claude has Recommended badge | ⏳ | Issue #8 |
| TC-PROV-003 | Ollama has Free badge | ⏳ | Issue #8 |
| TC-PROV-004 | onChange called when provider clicked | ⏳ | Issue #8 |
| TC-PROV-005 | Shows Ollama status (Running/Not running) | ⏳ | Issue #8 |
| TC-PROV-006 | Model dropdown when Ollama selected | ⏳ | Issue #8 |
| TC-PROV-007 | Auto-select first model for Ollama | ⏳ | Issue #8 |
| TC-PROV-008 | Warning shown when Ollama unavailable | ⏳ | Issue #8 |
| TC-PROV-009 | Generate button validation with Ollama | ⏳ | Issue #8 |

---

## Issues Log

| Issue ID | Date | Test ID | Description | Severity | Status | Resolution |
|----------|------|---------|-------------|----------|--------|------------|
| QA-001 | 2026-01-23 | WIZ-* | Form validation silently failing due to wrong schema type for title | Critical | ✅ Fixed | Changed `classDetailsSchema.shape.grade.optional()` to `z.string().optional()` |
| QA-002 | 2026-01-23 | AUTH-* | CardTitle renders as div, not heading | Medium | ✅ Fixed | Use `getByText()` instead of `getByRole("heading")` |
| QA-003 | 2026-01-23 | WIZ-002 | "Inspiration" text matches multiple elements | Low | ✅ Fixed | Added `{ exact: true }` to text assertions |
| QA-004 | 2026-01-23 | PROJ-003 | Firefox slow Supabase connection | Low | ✅ Fixed | Increased timeout to 15s |
| QA-005 | 2026-01-24 | AUTH-009/010 | OAuth providers (Google/Apple) not enabled in Supabase | Medium | ✅ Fixed | Configured Google OAuth in Supabase dashboard, updated .env to use hosted Supabase |
| QA-006 | 2026-01-24 | A11Y-005/006/007/008 | Accessibility authenticated tests failing - mock auth not intercepting Supabase session endpoint | Medium | ✅ Fixed | Added `/auth/v1/session` and `/rest/v1/profiles` route mocks to beforeEach |
| QA-007 | 2026-01-24 | AUTH-003 | Auth form submit test flaky due to loading state timeout | Low | ✅ Fixed | Updated test to wait for loading or error states, then verify form returns |

---

## Adding New Tests

When implementing new features, add corresponding tests:

### 1. Unit Test
Add to `src/__tests__/` following existing patterns.

### 2. E2E Test
Add to appropriate `e2e/*.spec.ts` file:
```typescript
test("[CAT]-XXX: description", async ({ page }) => {
  // Test implementation
});
```

### 3. Update This Document
Add row to the relevant category table:
```markdown
| [CAT]-XXX | Description | ⏳ | ⏳ | ⏳ | New |
```

---

## Test Commands

```bash
# Full QA run (all tests)
npm run test:run && cd generation-api && npm run test:run && cd .. && npx playwright test

# Quick E2E (Chromium only)
npx playwright test --project=chromium

# Specific test file
npx playwright test e2e/wizard.spec.ts

# Debug mode
npx playwright test --ui

# View report
npx playwright show-report
```

---

## Quality Gates

| Gate | Requirement | Current |
|------|-------------|---------|
| Unit Tests | 100% passing | ✅ 494/494 |
| E2E Tests | ≥95% passing | ✅ 100% (177/177) |
| Critical Issues | 0 open | ✅ 0 |
| High Issues | 0 open | ✅ 0 |
| Medium Issues | 0 open | ✅ 0 |
| Documentation | Updated | ✅ |

---

## Untested User Flows

The current E2E tests verify **UI element visibility and basic interactions**, not full end-to-end user flows. The following flows require real backend integration and are not covered by automated tests:

| Flow | Reason Not Tested | Manual Test Status |
|------|-------------------|-------------------|
| OAuth Sign-In (Google) | Configured and working | ✅ Manually verified |
| OAuth Sign-In (Apple) | Requires Apple Developer account setup | ⏳ Not configured |
| Email Sign-In | Would require test Supabase credentials | ⏳ Not tested |
| Email Sign-Up | Would create real user accounts | ⏳ Not tested |
| AI Generation Flow | Would incur API costs (Anthropic/OpenAI) | ⏳ Not tested |
| PDF Export | Requires completed project | ⏳ Not tested |
| Project Save/Load | Requires authenticated session | ⏳ Not tested |
| Credits Deduction | Requires real generation | ⏳ Not tested |

**Recommendation**: Create a dedicated test environment with:
- Test Supabase project with OAuth providers configured
- Mocked AI responses for generation testing
- Isolated test user accounts

---

## History

| Date | Tests | Pass Rate | Notes |
|------|-------|-----------|-------|
| 2026-01-24 | 671 | 100% | QA run: Fixed A11Y authenticated tests (mock session endpoint), AUTH-003 timing |
| 2026-01-24 | 595 | 100% | Full QA run, documented untested flows |
| 2026-01-23 | 575 | 100% | Initial full pass after E2E fixes |
| 2026-01-23 | 563 | 67% | E2E tests created, selectors fixed |
| 2026-01-23 | 431 | 100% | Unit tests only |
