# PRD Template

Use this template for all Product Requirements Documents. All sections are required unless marked optional.

---

# [Feature Name]

## Story Status

| Field | Value |
|-------|-------|
| **Status** | Draft / In Review / Approved / In Progress / Complete |
| **Priority** | P0 (Critical) / P1 (High) / P2 (Medium) / P3 (Low) |
| **Owner** | [Name] |
| **Created** | YYYY-MM-DD |
| **Last Updated** | YYYY-MM-DD |
| **Target Release** | [Version or Sprint] |
| **Estimated Effort** | [T-shirt size: XS/S/M/L/XL] |

---

## Overview

### Problem Statement
[What problem does this feature solve? Why is it needed?]

### Goals
- [Goal 1]
- [Goal 2]

### Non-Goals
- [What this feature explicitly does NOT cover]

---

## User Stories

```
As a [user type],
I want to [action],
So that [benefit].
```

### Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

---

## Implementation Plan

### Phase 1: [Phase Name]
**Scope:** [Brief description]

| Task | Owner | Status | Dependencies |
|------|-------|--------|--------------|
| Task 1 | - | Not Started | - |
| Task 2 | - | Not Started | Task 1 |

### Phase 2: [Phase Name] (if applicable)
[Repeat structure]

### Technical Approach

#### Architecture Changes
[Describe any architectural changes, new components, or integrations]

#### Database Changes
[New tables, columns, migrations required]

#### API Changes
[New endpoints, modified endpoints, breaking changes]

#### UI Changes
[New screens, modified components, UX considerations]

---

## Required Tests

### Unit Tests

| Component/Function | Test Cases | Priority |
|-------------------|------------|----------|
| [Name] | - Case 1<br>- Case 2 | Critical |
| [Name] | - Case 1<br>- Case 2 | High |

### Integration Tests

| Integration Point | Test Cases | Priority |
|------------------|------------|----------|
| [Name] | - Case 1<br>- Case 2 | Critical |

### E2E Tests

| User Journey | Test Cases | Priority |
|-------------|------------|----------|
| [Journey Name] | - Happy path<br>- Error handling | Critical |

### Test Coverage Requirements

- [ ] Unit test coverage meets 80% minimum
- [ ] Integration tests cover all API endpoints
- [ ] E2E tests cover critical user journeys
- [ ] All tests pass in CI pipeline

---

## Dependencies

### Internal Dependencies
- [Dependency 1]
- [Dependency 2]

### External Dependencies
- [Third-party service or library]

### Blocked By
- [Other PRD or feature that must complete first]

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Strategy] |

---

## Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| [Metric 1] | [Target value] | [How to measure] |

---

## Timeline

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| PRD Approved | YYYY-MM-DD | |
| Development Start | YYYY-MM-DD | |
| Testing Complete | YYYY-MM-DD | |
| Release | YYYY-MM-DD | |

---

## Appendix (Optional)

### Wireframes/Mockups
[Links or embedded images]

### Technical Specifications
[Detailed technical docs if needed]

### Open Questions
- [ ] [Question 1]
- [ ] [Question 2]

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| YYYY-MM-DD | [Name] | Initial draft |
