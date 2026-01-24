# Testing Directives

This document defines the testing standards and requirements for the TA (Teacher's Assistant) project. These directives must be enforced after any PRD is created and before implementation begins.

## Coverage Requirements

### Unit Tests

**Minimum Coverage: 80%**

| Layer | Coverage Target | Priority |
|-------|----------------|----------|
| Utility functions | 95% | Critical |
| State management (stores) | 90% | Critical |
| Custom hooks | 85% | High |
| Service functions | 85% | High |
| UI Components | 75% | Medium |

### Integration Tests

**Minimum Coverage: 70%**

| Area | Coverage Target | Priority |
|------|----------------|----------|
| API endpoints | 90% | Critical |
| Database operations | 85% | Critical |
| Authentication flows | 90% | Critical |
| Cross-component workflows | 75% | High |

### End-to-End Tests

**Coverage: Critical user journeys only**

| Journey | Required |
|---------|----------|
| User signup/login | Yes |
| Create project (full wizard) | Yes |
| View/manage projects | Yes |
| Generation flow | Yes |
| Credit operations | Yes |

---

## Testing Standards

### Unit Test Requirements

1. **Isolation**: Each unit test must test a single unit of functionality in isolation
2. **Mocking**: External dependencies (APIs, databases, file system) must be mocked
3. **Naming**: Use descriptive names following the pattern: `should [expected behavior] when [condition]`
4. **Arrangement**: Follow AAA pattern (Arrange, Act, Assert)
5. **Edge Cases**: Include tests for:
   - Empty/null inputs
   - Boundary conditions
   - Error states
   - Invalid inputs

### Integration Test Requirements

1. **Scope**: Test interaction between 2+ components/modules
2. **Database**: Use test database or in-memory alternatives
3. **API**: Test actual HTTP requests against test server
4. **State**: Verify state changes propagate correctly across the system
5. **Cleanup**: Each test must clean up after itself

### E2E Test Requirements

1. **User Perspective**: Tests must simulate real user behavior
2. **Critical Paths**: Focus on business-critical user journeys
3. **Stability**: Tests must be deterministic (no flaky tests)
4. **Performance**: E2E tests should complete within reasonable time limits

---

## Test File Structure

```
src/
├── __tests__/                    # Global test utilities
│   ├── setup.ts                  # Test setup and configuration
│   ├── mocks/                    # Shared mocks
│   └── fixtures/                 # Test data fixtures
├── components/
│   └── [Component]/
│       ├── Component.tsx
│       └── Component.test.tsx    # Co-located unit tests
├── hooks/
│   └── useHook.ts
│   └── useHook.test.ts
├── stores/
│   └── store.ts
│   └── store.test.ts
└── services/
    └── service.ts
    └── service.test.ts

e2e/                              # E2E tests (separate directory)
├── auth.spec.ts
├── wizard.spec.ts
└── projects.spec.ts
```

---

## Testing Tools

### Frontend (React/TypeScript)

| Tool | Purpose |
|------|---------|
| Vitest | Test runner and assertions |
| @testing-library/react | Component testing |
| @testing-library/user-event | User interaction simulation |
| MSW (Mock Service Worker) | API mocking |
| Playwright | E2E testing |

### Backend (Node.js)

| Tool | Purpose |
|------|---------|
| Vitest or Jest | Test runner and assertions |
| Supertest | HTTP assertions |
| Test containers | Database testing |

---

## What Must Be Tested

### For Every New Feature

- [ ] All public functions have unit tests
- [ ] All state mutations are tested
- [ ] Error handling paths are tested
- [ ] Loading/pending states are tested
- [ ] Success/failure callbacks are tested

### For Every New Component

- [ ] Renders without crashing
- [ ] Renders correct content based on props
- [ ] User interactions trigger correct handlers
- [ ] Accessibility: keyboard navigation, ARIA labels
- [ ] Conditional rendering logic

### For Every New API Endpoint

- [ ] Returns correct status codes
- [ ] Returns correct response shape
- [ ] Validates input correctly
- [ ] Handles authentication/authorization
- [ ] Handles errors gracefully

### For Every New Store/State

- [ ] Initial state is correct
- [ ] Actions update state correctly
- [ ] Selectors return correct data
- [ ] Async actions handle loading/error states
- [ ] State persists correctly (if applicable)

---

## Test Documentation

Each test file should include:

```typescript
/**
 * @description Tests for [Component/Function Name]
 * @covers [List of functions/behaviors covered]
 * @dependencies [External dependencies that are mocked]
 */
```

---

## Continuous Integration

All tests must pass before:
- Merging any pull request
- Deploying to any environment

### CI Pipeline Requirements

1. Run unit tests on every push
2. Run integration tests on PR creation
3. Run E2E tests before deployment
4. Generate and track coverage reports
5. Fail build if coverage drops below thresholds

---

## Test Review Checklist

Before approving any PR, verify:

- [ ] New code has corresponding tests
- [ ] Tests are meaningful (not just for coverage)
- [ ] Tests follow naming conventions
- [ ] No skipped tests without documented reason
- [ ] Coverage thresholds are maintained
- [ ] E2E tests updated for new user journeys

---

## Exceptions

Tests may be skipped only with documented justification for:
- Generated code (e.g., GraphQL types)
- Third-party library wrappers with no custom logic
- Configuration files

All exceptions must be approved during code review.
