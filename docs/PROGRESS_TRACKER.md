# TA (Teacher's Assistant) - Progress Tracker

This document tracks the implementation progress of the TA MVP.

---

## Current Status

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Project Setup | Complete | 100% |
| Phase 2: Authentication | Complete | 100% |
| Phase 3: Core UI Layout | Complete | 100% |
| Phase 4: Creation Wizard | Complete | 100% |
| Phase 5: Testing Infrastructure | Complete | 100% |
| Phase 6: Generation API Service | Not Started | 0% |
| Phase 7: Preview and Output | Not Started | 0% |
| Phase 8: Polish and Production | Not Started | 0% |

**Test Summary:** 178 tests passing across 12 test files

---

## Recent Milestone (2026-02-11)

- Backend-managed free local model rollout completed (Issues #51-#57).
- Local model policy locked to:
  - Primary: `llama3.1:8b`
  - Fallbacks: `qwen2.5:7b`, `gemma3:4b`, `llama3.2`
- Backend now owns local model resolution, warmup, and readiness.
- User-facing Ollama setup/model controls removed from header and wizard.
- Tauri invoke surface hardened by removing user-triggerable Ollama control commands.
- Validation snapshot:
  - Frontend unit tests: 1023/1023 passing
  - Generation API unit tests: 614/614 passing (with test Supabase env vars)

---

## Completed Work

### Phase 1: Project Setup
- [x] Archive existing files to `archive/`
- [x] Initialize Tauri v2 with React + TypeScript
- [x] Configure Vite with path aliases
- [x] Set up Tailwind CSS with shadcn/ui
- [x] Install core dependencies (Zustand, react-hook-form, zod, dnd-kit, Supabase)
- [x] Create folder structure

### Phase 2: Authentication
- [x] Create Supabase migration (`001_initial_schema.sql`)
- [x] Database schema: profiles, credits, credit_transactions, projects, project_versions
- [x] TypeScript types for database (`src/types/database.ts`)
- [x] Auth store (`src/stores/authStore.ts`)
- [x] useAuth hook (`src/hooks/useAuth.ts`)
- [x] LoginForm component
- [x] SignupForm component
- [x] AuthGuard component
- [x] AuthPage component

### Phase 3: Core UI Layout
- [x] AppLayout component (3-panel design)
- [x] Header with credits badge and user menu
- [x] Sidebar with stacked panels
- [x] CreationPanel with prompt input
- [x] ProjectsPanel with project list
- [x] InspirationPanel with drag-drop
- [x] WelcomeScreen
- [x] MainContent router
- [x] Project store (`src/stores/projectStore.ts`)
- [x] Inspiration store (`src/stores/inspirationStore.ts`)

### Phase 4: Creation Wizard
- [x] Wizard store (`src/stores/wizardStore.ts`)
- [x] WizardDialog component
- [x] WizardProgress component
- [x] ClassDetailsStep (grade, subject, format)
- [x] InspirationStep (select items)
- [x] OutputStep (folder selection)
- [x] GenerationStep (progress display)
- [x] ProjectPreview component

### Phase 5: Testing Infrastructure
- [x] Set up Vitest and Testing Library
- [x] Create test utilities and mocks
- [x] Unit tests for stores
- [x] Unit tests for validators
- [x] Component tests for auth
- [x] Component tests for panels

#### Test Files Created
| File | Tests | Status |
|------|-------|--------|
| `src/__tests__/setup.ts` | Setup | Complete |
| `src/__tests__/utils.tsx` | Utilities | Complete |
| `src/__tests__/mocks/supabase.ts` | Mock | Complete |
| `src/__tests__/stores/authStore.test.ts` | 15 tests | Complete |
| `src/__tests__/stores/projectStore.test.ts` | 18 tests | Complete |
| `src/__tests__/stores/inspirationStore.test.ts` | 13 tests | Complete |
| `src/__tests__/stores/wizardStore.test.ts` | 18 tests | Complete |
| `src/__tests__/lib/validators.test.ts` | 27 tests | Complete |
| `src/__tests__/lib/utils.test.ts` | 11 tests | Complete |
| `src/__tests__/components/auth/LoginForm.test.tsx` | 10 tests | Complete |
| `src/__tests__/components/auth/SignupForm.test.tsx` | 11 tests | Complete |
| `src/__tests__/components/auth/AuthGuard.test.tsx` | 6 tests | Complete |
| `src/__tests__/components/panels/CreationPanel.test.tsx` | 12 tests | Complete |
| `src/__tests__/components/panels/ProjectsPanel.test.tsx` | 15 tests | Complete |
| `src/__tests__/components/panels/InspirationPanel.test.tsx` | 16 tests | Complete |

---

## In Progress

---

## Remaining Work

### Phase 6: Generation API Service
- [ ] Set up Node.js/Express project
- [ ] JWT verification middleware
- [ ] AI provider abstraction (Claude + OpenAI)
- [ ] Prompt templates
- [ ] Credit reservation system
- [ ] PDF generation via Playwright
- [ ] API tests

### Phase 7: Preview and Output
- [ ] PreviewTabs component
- [ ] HTMLRenderer (sandboxed iframe)
- [ ] Tauri file system commands
- [ ] PDF download integration
- [ ] Export functionality

### Phase 8: Polish and Production
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] E2E tests
- [ ] Tauri bundling
- [ ] Documentation

---

## Blockers

| Blocker | Impact | Resolution |
|---------|--------|------------|
| None currently | - | - |

---

## Notes

- Testing infrastructure is complete - 178 tests passing
- All new features require tests per `docs/TESTING_DIRECTIVES.md`
- PRDs for remaining phases should be created using `docs/PRD_TEMPLATE.md`
- Next step: Generation API Service (Phase 6)

---

## Changelog

| Date | Update |
|------|--------|
| 2024-01-23 | Initial tracker created |
| 2024-01-23 | Phases 1-4 marked complete |
| 2024-01-23 | Phase 5 (Testing) started |
| 2024-01-23 | Phase 5 (Testing) completed - 178 tests across 12 files |
| 2026-02-11 | Backend-managed free local model rollout completed (Issues #51-#57, PRs #58-#63) |
