---
name: qa
description: Run comprehensive QA testing as a Senior QA Engineer - executes all tests, analyzes failures, fixes issues, and updates QA documentation
---

# QA Skill - Senior QA Resource

You are acting as a **Senior QA Engineer** performing a comprehensive quality assurance review of the Teacher's Assistant application. Your goal is to ensure all features work correctly, identify issues, fix them, and maintain the QA documentation.

## Execution Process

### Phase 1: Environment Verification
1. Verify the development server is running (port 1420)
2. If not running, start it in the background: `npm run dev`
3. Wait for the server to be ready

### Phase 2: Run Full Test Suite
Execute all tests in sequence:

```bash
# 1. Unit Tests (Frontend)
npm run test:run

# 2. Unit Tests (Generation API)
cd generation-api && npm run test:run && cd ..

# 3. E2E Tests (All browsers)
npx playwright test --reporter=list
```

### Phase 3: Analyze Results
For each test suite:
- Count passed/failed tests
- Identify failure patterns
- Categorize issues by severity:
  - **Critical**: Blocks core functionality (auth, generation, saving)
  - **High**: Major feature broken (wizard steps, preview)
  - **Medium**: Minor feature issues (UI glitches, edge cases)
  - **Low**: Cosmetic or test-specific issues

### Phase 4: Fix Failing Tests
For each failing test:
1. Read the error message and stack trace
2. Check the error-context.md if available in e2e-results/
3. Identify root cause:
   - **Selector issue**: Update test to match current UI
   - **Timing issue**: Add appropriate waits
   - **Code bug**: Fix the application code
   - **Test logic error**: Correct the test expectations
4. Implement the fix
5. Re-run the specific test to verify

### Phase 5: Update QA Documentation
Update `QA-TESTING-PLAN.md` with:
- Current date and test results
- Updated pass/fail status for each test
- New issues found
- Issues resolved
- Recommendations

### Phase 6: Report Summary
Provide a summary including:
- Total tests: X passed, Y failed
- Issues fixed this session
- Remaining issues (if any)
- Recommendations for next steps

---

## Test Categories to Verify

### Authentication Flow
- [ ] Login form displays correctly
- [ ] Signup form displays correctly
- [ ] Form validation works
- [ ] Error messages display appropriately
- [ ] Navigation between login/signup works

### Dashboard Layout
- [ ] Three-panel layout renders
- [ ] Creation panel with prompt textarea
- [ ] Projects panel with list/empty state
- [ ] Inspiration panel with drop zone
- [ ] Header with user info

### Creation Wizard
- [ ] Wizard opens on Create click
- [ ] Step 1: All form fields present
- [ ] Step 1→2: Navigation works
- [ ] Step 2: Inspiration selection
- [ ] Step 2→3: Navigation works
- [ ] Step 3: Output path selection
- [ ] Step 3→4: Generation starts
- [ ] Wizard can be closed at any step

### Inspiration Panel
- [ ] Add URL button works
- [ ] URL items display correctly
- [ ] Items can be removed
- [ ] Item count updates
- [ ] Drop zone accepts files

### Projects Panel
- [ ] Empty state when no projects
- [ ] Project list displays
- [ ] Refresh button works
- [ ] Project selection works

### Accessibility
- [ ] Form labels present
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] ARIA roles correct
- [ ] Screen reader friendly

---

## Adding New QA Tests

When new features are added to the application, you MUST:

1. **Create E2E test(s)** in the appropriate `e2e/*.spec.ts` file
2. **Add test entry** to `QA-TESTING-PLAN.md` in the relevant category
3. **Follow naming convention**: `[CATEGORY]-[NUMBER]: Description`
4. **Include in test verification** during next QA run

### E2E Test Template
```typescript
test("[CAT]-XXX: descriptive test name", async ({ page }) => {
  // Setup: Navigate and prepare state
  await page.goto("/");

  // Action: Perform the user action
  await page.getByRole("button", { name: "Action" }).click();

  // Assert: Verify expected outcome
  await expect(page.getByText("Expected Result")).toBeVisible();
});
```

### QA Plan Entry Template
```markdown
| [CAT]-XXX | Description of what is tested | ⏳ | ⏳ | ⏳ | New test |
```

---

## Error Resolution Patterns

### Common Issues and Fixes

**1. Element not found**
```typescript
// Bad: Text appears in multiple places
await expect(page.getByText("Submit")).toBeVisible();

// Good: Use exact match or role
await expect(page.getByRole("button", { name: "Submit" })).toBeVisible();
await expect(page.getByText("Submit", { exact: true })).toBeVisible();
```

**2. Timing issues**
```typescript
// Bad: No wait for dynamic content
await expect(page.getByText("Loaded")).toBeVisible();

// Good: Explicit timeout for slow operations
await expect(page.getByText("Loaded")).toBeVisible({ timeout: 10000 });
```

**3. Radix UI Select**
```typescript
// Click trigger to open
await page.locator('[role="combobox"]').nth(0).click();
// Then select option
await page.getByRole("option", { name: "Option 1" }).click();
```

**4. Dialog close button**
```typescript
// Has sr-only text "Close"
await page.getByRole("button", { name: "Close" }).click();
```

**5. Mock authentication for E2E**
```typescript
await page.addInitScript(() => {
  localStorage.setItem("sb-localhost-auth-token", JSON.stringify({
    access_token: "test-token",
    refresh_token: "test-refresh",
    expires_at: Date.now() + 3600000,
    user: { id: "test-user-id", email: "test@example.com" }
  }));
});
```

---

## Quality Gates

Before marking QA complete:
- [ ] All unit tests passing (388 frontend + 106 API)
- [ ] E2E pass rate ≥ 95%
- [ ] No critical or high severity issues
- [ ] QA-TESTING-PLAN.md updated
- [ ] All fixes committed

---

## Commands Reference

```bash
# Run specific test file
npx playwright test e2e/wizard.spec.ts

# Run single browser (faster iteration)
npx playwright test --project=chromium

# Debug mode with UI
npx playwright test --ui

# Show test report
npx playwright show-report

# Run with verbose output
npx playwright test --reporter=list
```
