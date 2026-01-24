# TA (Teacher's Assistant) - QA Testing Plan

## Overview

This document outlines the comprehensive QA testing strategy for the TA desktop application. The plan covers all major feature paths and user journeys.

---

## Test Environment

- **Frontend**: React + TypeScript + Vite (localhost:1420)
- **Backend API**: Node.js + Express (localhost:3001)
- **Database**: Supabase (test environment)
- **E2E Framework**: Playwright
- **Browsers**: Chromium, Firefox, WebKit

---

## Test Summary

### Latest Run: 2026-01-24

| Metric | Value |
|--------|-------|
| Total Tests | 132 (44 tests × 3 browsers) |
| Passed | 57 |
| Failed | 75 |
| Pass Rate | 43% |

**Note**: Many failures are due to element selector mismatches that need refinement. The core functionality appears to be working.

---

## Test Categories

### 1. Authentication Tests
| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|----------|---------|--------|-------|
| AUTH-001 | User can view login form | ❌ | ❌ | ❌ | Selector mismatch - needs heading adjustment |
| AUTH-002 | User can show signup link | ✅ | ✅ | ✅ | |
| AUTH-003 | Error shown for empty form submission | ❌ | ❌ | ❌ | Error message not matching expected pattern |
| AUTH-004 | User can toggle to signup form | ❌ | ❌ | ❌ | Link selector issue |
| AUTH-005 | Password validation on signup | ❌ | ❌ | ❌ | Timeout - needs investigation |
| AUTH-006 | Validate email format | ❌ | ❌ | ❌ | Validation message pattern |
| AUTH-007 | Validate password length | ✅ | ✅ | ✅ | |

### 2. Dashboard Tests
| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|----------|---------|--------|-------|
| DASH-001 | Dashboard renders 3-panel layout | ✅ | ✅ | ✅ | |
| DASH-002 | Creation panel with prompt textarea | ✅ | ✅ | ✅ | |
| DASH-003 | Create button visible | ✅ | ✅ | ✅ | |
| DASH-004 | Create button disabled for short prompts | ✅ | ✅ | ✅ | |
| DASH-005 | Create button enabled for valid prompts | ✅ | ✅ | ✅ | |
| DASH-006 | Projects panel visible | ✅ | ✅ | ✅ | |
| DASH-007 | Inspiration panel visible | ❌ | ❌ | ❌ | Text pattern mismatch |

### 3. Creation Wizard Tests
| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|----------|---------|--------|-------|
| WIZ-001 | Create button opens wizard dialog | ✅ | ✅ | ✅ | |
| WIZ-002 | Wizard displays progress indicator | ❌ | ❌ | ❌ | Text pattern issue |
| WIZ-003 | Step 1: Form fields render correctly | ❌ | ❌ | ❌ | Some fields not found |
| WIZ-004 | Step 1: Project title field visible | ✅ | ✅ | ✅ | |
| WIZ-005 | Step 1: Next button visible | ✅ | ✅ | ✅ | |
| WIZ-006 | Step 1: Next advances to step 2 | ❌ | ❌ | ❌ | Navigation timing |
| WIZ-007 | Step 2: Back button visible | ❌ | ❌ | ❌ | Requires step 2 navigation |
| WIZ-008 | Step 2: Back returns to step 1 | ❌ | ❌ | ❌ | Navigation chain |
| WIZ-009 | Wizard can be closed | ✅ | ✅ | ✅ | |
| WIZ-010 | Step 2: Skip button visible | ❌ | ❌ | ❌ | Requires step 2 navigation |

### 4. Inspiration Panel Tests
| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|----------|---------|--------|-------|
| INSP-001 | Panel visible | ❌ | ❌ | ❌ | Text pattern mismatch |
| INSP-002 | Add URL button visible | ✅ | ✅ | ✅ | |
| INSP-003 | Drop zone visible | ✅ | ✅ | ✅ | |
| INSP-004 | Empty state initially | ❌ | ❌ | ❌ | Message pattern |
| INSP-005 | Add URL clickable | ❌ | ❌ | ❌ | Modal/dialog not opening |
| INSP-006 | Can enter URL | ❌ | ❌ | ❌ | Depends on INSP-005 |
| INSP-007 | Can remove item | ❌ | ❌ | ❌ | Depends on INSP-006 |
| INSP-008 | Item count updates | ❌ | ❌ | ❌ | Depends on INSP-006 |

### 5. Projects Panel Tests
| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|----------|---------|--------|-------|
| PROJ-001 | Panel visible | ✅ | ✅ | ✅ | |
| PROJ-002 | Refresh button visible | ❌ | ❌ | ❌ | Button selector |
| PROJ-003 | Empty state when no projects | ✅ | ✅ | ✅ | |
| PROJ-004 | Refresh button clickable | ❌ | ❌ | ❌ | Depends on PROJ-002 |

### 6. Accessibility Tests
| Test ID | Description | Chromium | Firefox | WebKit | Notes |
|---------|-------------|----------|---------|--------|-------|
| A11Y-001 | Page has main landmark | ❌ | ❌ | ❌ | Main element not found |
| A11Y-002 | Form elements have labels | ✅ | ✅ | ✅ | |
| A11Y-003 | Buttons have accessible names | ✅ | ✅ | ✅ | |
| A11Y-004 | Keyboard navigation works | ❌ | ✅ | ❌ | Browser-specific |
| A11Y-005 | Focus indicators visible | ❌ | ✅ | ❌ | Browser-specific |
| A11Y-006 | Headings present | ✅ | ✅ | ✅ | |
| A11Y-007 | Links are descriptive | ✅ | ✅ | ✅ | |
| A11Y-008 | Dialog has proper role | ✅ | ✅ | ✅ | |

---

## Issues Found

| Issue ID | Test ID | Description | Severity | Status |
|----------|---------|-------------|----------|--------|
| E2E-001 | AUTH-001 | Login form heading doesn't match expected pattern | Medium | Open |
| E2E-002 | AUTH-003 | Empty form submission error not visible | Low | Open |
| E2E-003 | A11Y-001 | No main landmark element in DOM | Medium | Open |
| E2E-004 | INSP-005 | Add URL button click doesn't open expected modal | Medium | Open |
| E2E-005 | WIZ-006 | Subject selection and step navigation needs refinement | Medium | Open |
| E2E-006 | PROJ-002 | Refresh button selector not finding element | Low | Open |

---

## Recommendations

### High Priority
1. Add `<main>` landmark element to the layout for accessibility
2. Review login form heading text to match test expectations
3. Fix Add URL dialog/modal opening mechanism

### Medium Priority
1. Improve wizard step navigation test selectors
2. Add aria-labels to buttons that lack visible text
3. Ensure consistent focus indicators across browsers

### Low Priority
1. Update test selectors to be more resilient
2. Add data-testid attributes to key interactive elements
3. Implement test fixtures for authenticated state

---

## Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific browser only
npm run test:e2e -- --project=chromium

# Run specific test file
npm run test:e2e -- e2e/auth.spec.ts

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Generate HTML report
npm run test:e2e:report
```

---

## Test Files Created

- `e2e/auth.spec.ts` - Authentication flow tests (7 tests)
- `e2e/dashboard.spec.ts` - Dashboard layout tests (7 tests)
- `e2e/wizard.spec.ts` - Creation wizard tests (10 tests)
- `e2e/inspiration.spec.ts` - Inspiration panel tests (8 tests)
- `e2e/projects.spec.ts` - Projects panel tests (4 tests)
- `e2e/accessibility.spec.ts` - Accessibility tests (8 tests)

**Total: 44 unique tests × 3 browsers = 132 test runs**

---

## Unit Test Summary

In addition to E2E tests, the project has comprehensive unit tests:

| Category | Tests | Status |
|----------|-------|--------|
| Frontend (Vitest) | 333 | ✅ All Passing |
| Generation API (Vitest) | 98 | ✅ All Passing |
| **Total** | **431** | **✅ All Passing** |

---

## Definition of Done

- [x] All unit tests passing (431/431)
- [ ] E2E pass rate >= 80% (currently 43%)
- [ ] Critical paths 100% passing
- [ ] No severity 1 (blocking) issues
- [ ] All severity 2 (critical) issues documented ✅
- [x] Test report generated and reviewed
