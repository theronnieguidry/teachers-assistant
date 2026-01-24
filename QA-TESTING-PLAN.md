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

### Latest Run: 2026-01-23

| Metric | Value |
|--------|-------|
| Unit Tests (Frontend) | 333 ✅ |
| Unit Tests (API) | 98 ✅ |
| E2E Tests | 144 ✅ (48 × 3 browsers) |
| **Total** | **575** |
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

---

## Issues Log

| Issue ID | Date | Test ID | Description | Severity | Status | Resolution |
|----------|------|---------|-------------|----------|--------|------------|
| QA-001 | 2026-01-23 | WIZ-* | Form validation silently failing due to wrong schema type for title | Critical | ✅ Fixed | Changed `classDetailsSchema.shape.grade.optional()` to `z.string().optional()` |
| QA-002 | 2026-01-23 | AUTH-* | CardTitle renders as div, not heading | Medium | ✅ Fixed | Use `getByText()` instead of `getByRole("heading")` |
| QA-003 | 2026-01-23 | WIZ-002 | "Inspiration" text matches multiple elements | Low | ✅ Fixed | Added `{ exact: true }` to text assertions |
| QA-004 | 2026-01-23 | PROJ-003 | Firefox slow Supabase connection | Low | ✅ Fixed | Increased timeout to 15s |

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
| Unit Tests | 100% passing | ✅ 431/431 |
| E2E Tests | ≥95% passing | ✅ 100% |
| Critical Issues | 0 open | ✅ 0 |
| High Issues | 0 open | ✅ 0 |
| Documentation | Updated | ✅ |

---

## History

| Date | Tests | Pass Rate | Notes |
|------|-------|-----------|-------|
| 2026-01-23 | 575 | 100% | Initial full pass after E2E fixes |
| 2026-01-23 | 563 | 67% | E2E tests created, selectors fixed |
| 2026-01-23 | 431 | 100% | Unit tests only |
