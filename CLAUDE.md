# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TA (Teacher's Assistant)** - A Tauri v2 desktop application that generates print-ready K-6 teaching materials (worksheets, lesson plans, answer keys) using AI. Target users are homeschooling parents and elementary teachers.

**Repository**: https://github.com/theronnieguidry/teachers-assistant

## Commands

```bash
# Frontend development
npm install                    # Install dependencies
npm run dev                    # Start Vite dev server (frontend only)
npm run dev:watch              # Start Vite + API with auto-restart on crash
npm run tauri dev              # Start Tauri dev mode (full app)
npm run tauri build            # Build production installer (Windows MSI/NSIS)

# Testing
npm test                       # Run unit tests in watch mode
npm run test:run               # Run unit tests once (333 tests)
npx playwright test            # Run E2E tests (144 tests across 3 browsers)
npx playwright test --project=chromium  # Run E2E in Chromium only

# Generation API (in generation-api/ directory)
cd generation-api
npm install
npm run dev                    # Start API server on localhost:3001
npm run test                   # Run API tests in watch mode
npm run test:run               # Run API tests once (98 tests)

# Database
npx supabase start             # Start local Supabase (requires Docker)
npx supabase db push           # Apply migrations

# GitHub workflow
gh issue list                  # View open issues
gh issue view <number>         # Read issue details
gh pr create                   # Create pull request
```

## Architecture

### Desktop App (Tauri v2 + React)

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components (Button, Card, Dialog, Tabs, etc.)
│   ├── auth/                  # LoginForm, SignupForm, AuthGuard, AuthPage
│   ├── layout/                # AppLayout, Sidebar, Header, Dashboard
│   ├── panels/                # CreationPanel, ProjectsPanel, InspirationPanel
│   ├── wizard/                # 4-step creation wizard components
│   └── preview/               # HTMLRenderer, PreviewTabs, ProjectPreview
├── stores/                    # Zustand stores
│   ├── authStore.ts           # Authentication state + Supabase auth
│   ├── projectStore.ts        # Projects CRUD + versions
│   ├── wizardStore.ts         # Creation wizard state machine
│   ├── inspirationStore.ts    # Inspiration items (drag/drop)
│   └── toastStore.ts          # Toast notifications
├── services/
│   ├── supabase.ts            # Supabase client
│   ├── generation-api.ts      # Generation API client
│   └── tauri-bridge.ts        # Tauri IPC commands wrapper
├── lib/
│   ├── utils.ts               # cn() helper
│   └── validators.ts          # Zod schemas for forms
└── types/                     # TypeScript interfaces
```

**Key patterns:**
- State management: Zustand stores with optional persistence
- Forms: react-hook-form + zod schemas
- Tauri IPC: Commands in `src-tauri/src/commands/`, called via `tauri-bridge.ts`
- UI components: shadcn/ui + Radix primitives in `src/components/ui/`
- Error handling: ErrorBoundary at app root + toast notifications
- Styling: Tailwind CSS with CSS variables for theming

### Generation API (Node.js/Express)

```
generation-api/
├── src/
│   ├── routes/
│   │   ├── generate.ts        # POST /generate - main generation endpoint
│   │   ├── credits.ts         # GET /credits - user credit balance
│   │   ├── pdf.ts             # POST /pdf - HTML to PDF conversion
│   │   └── health.ts          # GET /health - health check
│   ├── services/
│   │   ├── ai-provider.ts     # Claude/OpenAI abstraction
│   │   ├── credits.ts         # Credit management (reserve/deduct/refund)
│   │   ├── generator.ts       # Main generation orchestration
│   │   └── inspiration-parser.ts  # URL/PDF content extraction
│   ├── middleware/
│   │   └── auth.ts            # JWT verification via Supabase
│   ├── prompts/
│   │   └── templates.ts       # AI prompt templates
│   └── types.ts               # API type definitions
└── package.json
```

**API Flow:**
1. Client sends JWT + generation request
2. Auth middleware verifies JWT with Supabase
3. Credits service reserves credits atomically
4. Generator calls AI provider (Claude or OpenAI)
5. Results stored in project_versions table
6. Credits deducted, HTML returned to client

### Backend (Supabase)

**Tables:**
- `profiles` - User profile data (extends auth.users)
- `credits` - Balance, lifetime_granted, lifetime_used
- `credit_transactions` - Audit log for credits
- `projects` - Title, prompt, grade, subject, options, status
- `project_versions` - worksheet_html, lesson_plan_html, answer_key_html

**Key Functions:**
- `handle_new_user()` - Trigger grants 50 trial credits on signup
- `reserve_credits()` - Atomic credit deduction
- `refund_credits()` - Refund on generation failure

### Output Format

- **HTML** is the canonical format (generated by AI, stored in database)
- **PDF** converted via browser print or server-side Playwright
- **Local files** saved to user-selected folder via Tauri file system commands

## Testing

### Test Suite Summary

| Suite | Tests | Location |
|-------|-------|----------|
| Frontend Unit | 333 | `src/__tests__/` |
| Generation API | 98 | `generation-api/src/__tests__/` |
| E2E (Playwright) | 144 | `e2e/` |
| **Total** | **575** | |

### Running Tests

```bash
# All unit tests
npm run test:run

# Generation API tests
cd generation-api && npm run test:run

# E2E tests (requires dev server on port 1420)
npx playwright test

# E2E single browser (faster)
npx playwright test --project=chromium

# E2E specific test file
npx playwright test e2e/wizard.spec.ts

# E2E with UI mode (debugging)
npx playwright test --ui
```

### E2E Test Structure

```
e2e/
├── auth.spec.ts           # Login/signup form tests (8 tests)
├── dashboard.spec.ts      # Main layout tests (8 tests)
├── wizard.spec.ts         # Creation wizard flow (10 tests)
├── inspiration.spec.ts    # Inspiration panel (10 tests)
├── projects.spec.ts       # Projects panel (4 tests)
└── accessibility.spec.ts  # A11Y tests (8 tests)
```

**E2E patterns:**
- Mock auth via `localStorage.setItem("sb-127-auth-token", ...)` (key derived from Supabase URL hostname)
- Use `page.waitForSelector()` before assertions
- Radix Select: Click trigger, then `getByRole("option")`
- Dialog close: `getByRole("button", { name: "Close" })` (sr-only text)
- Use `{ exact: true }` for text that appears in multiple places

## Key Files

| File | Purpose |
|------|---------|
| `src/stores/wizardStore.ts` | Creation wizard state machine |
| `src/stores/toastStore.ts` | Toast notification system |
| `src/services/generation-api.ts` | API client with streaming support |
| `src/services/tauri-bridge.ts` | Tauri IPC commands (includes Ollama) |
| `src/components/preview/PreviewTabs.tsx` | Tabbed preview with print/PDF |
| `src/components/settings/OllamaSetup.tsx` | Local AI setup wizard |
| `generation-api/src/services/ai-provider.ts` | Claude/OpenAI/Ollama abstraction |
| `generation-api/src/prompts/templates.ts` | AI prompt templates |
| `src-tauri/src/commands/ollama.rs` | Tauri commands for Ollama management |
| `src-tauri/nsis/installer-hooks.nsh` | NSIS hooks for Ollama auto-install |
| `src-tauri/tauri.conf.json` | Tauri bundling configuration |
| `playwright.config.ts` | E2E test configuration |

## Environment Variables

**Frontend (.env):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GENERATION_API_URL=http://localhost:3001
```

**Generation API (.env):**
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Provider (choose one: claude, openai, ollama)
AI_PROVIDER=ollama

# Cloud providers (require API keys)
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key

# Ollama (free local LLM - no API key needed)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

## AI Providers

The application supports three AI providers:

| Provider | Cost | Setup | Quality |
|----------|------|-------|---------|
| **Claude** | Paid (API) | Add `ANTHROPIC_API_KEY` | Excellent |
| **OpenAI** | Paid (API) | Add `OPENAI_API_KEY` | Excellent |
| **Ollama** | Free | Install Ollama locally | Good (model dependent) |

### Using Ollama (Free Local LLM)

Ollama runs AI models locally on your machine - completely free with no API costs.

**Auto-Install (Recommended):**
When you install TA Teachers Assistant, Ollama is automatically installed as part of the setup process. On first launch, if no models are available, the app will prompt you to download the recommended `llama3.2` model.

The Settings (gear icon) in the header opens the Local AI Setup dialog where you can:
- Install/manage Ollama
- Start/stop the Ollama server
- Download additional models

**Manual Setup (Alternative):**
```bash
# 1. Download and install from https://ollama.com/download

# 2. Pull a model (choose based on your RAM)
ollama pull llama3.2      # 2GB, good for 8GB RAM
ollama pull llama3.1:8b   # 4.7GB, better quality
ollama pull mistral       # 4GB, fast and capable

# 3. Start the server
ollama serve

# 4. Set in generation-api/.env
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.2
```

**Recommended Models for K-6 Content:**
- `llama3.2` - Good balance of speed and quality (default)
- `llama3.2:1b` - Fastest, smallest footprint
- `mistral` - Fast, good for worksheets
- `gemma2:2b` - Google's efficient model

## Local Development & Testing

### API Cost Avoidance

**IMPORTANT**: When running local tests or development that would normally call AI APIs (Anthropic/OpenAI), do NOT use production API credits. Instead:

1. **Use Ollama**: Set `AI_PROVIDER=ollama` for free local generation
2. **Unit Tests**: All AI service calls should be mocked (see `src/__tests__/mocks/`)
3. **E2E Tests**: Do not test actual generation flow - mock API responses
4. **Integration Testing**: When testing the generation API locally, prefer:
   - Mocked responses for automated tests
   - Local/free model alternatives if available
   - Minimal test prompts if real API calls are necessary

This ensures development and testing do not incur unnecessary API costs.

### Dev Watcher

The `npm run dev:watch` command starts a robust development environment that:

1. **Starts both servers**: Vite dev server (port 1420) and Generation API (port 3001)
2. **Auto-clears ports**: Kills any orphaned processes occupying the ports before starting
3. **Auto-restarts on crash**: If either server crashes, it restarts automatically after 3 seconds
4. **Health monitoring**: Checks server health every 30 seconds and restarts unresponsive servers
5. **Graceful shutdown**: Press Ctrl+C to stop all services cleanly

The watcher script is located at `scripts/dev-watcher.cjs`.

**Troubleshooting Port Conflicts:**

The dev watcher auto-restarts on crashes, but `.env` file changes require a full restart. If you see "Port already in use" errors:

```bash
# Option 1: Kill all Node processes (nuclear option)
taskkill //F //IM node.exe

# Option 2: Kill specific ports
# First, find the process IDs:
netstat -ano | findstr ":1420 :3001"

# Then kill them (replace PID with actual number):
taskkill //F //PID <PID>

# Then start fresh:
npm run dev:watch
```

**Note:** On Windows, use `//F` and `//PID` (double slashes) in taskkill commands when running from certain shells.

## Custom Skills

### `/qa` - Senior QA Engineer
Invokes a comprehensive QA review that:
1. Runs all unit tests (frontend + API)
2. Runs all E2E tests across 3 browsers
3. Analyzes failures and identifies root causes
4. Fixes failing tests (selectors, timing, code bugs)
5. Updates `QA-TESTING-PLAN.md` with results
6. Reports summary of issues found/fixed

**Usage**: Simply type `/qa` to start a full QA review.

**When adding new features**: The `/qa` skill expects new E2E tests to be added to `e2e/*.spec.ts` and documented in `QA-TESTING-PLAN.md`.

---

## Development Workflow

This project uses **issue-driven development**:

1. **Check for issues**: `gh issue list`
2. **Read issue details**: `gh issue view <number>`
3. **Implement** with appropriate unit and E2E tests
4. **Run full test suite**: `npm run test:run && npx playwright test`
5. **Commit** with descriptive message referencing issue
6. **Create PR**: `gh pr create`

### Creating Issues

**IMPORTANT**: All bugs, feature requests, and tasks MUST be created as GitHub issues using the `gh` CLI:

```bash
# Create a feature request
gh issue create --title "Feature: description" --label "enhancement"

# Create a bug report
gh issue create --title "Bug: description" --label "bug"

# Create a task
gh issue create --title "Task: description" --label "task"
```

When Claude identifies issues or the user requests new features, create GitHub issues rather than just noting them in conversation.

### Issue Templates

- `.github/ISSUE_TEMPLATE/feature_request.md` - New features
- `.github/ISSUE_TEMPLATE/bug_report.md` - Bug reports
- `.github/ISSUE_TEMPLATE/task.md` - General tasks

## Design Constraints

- **Offline access**: Past projects viewable without internet (HTML stored locally)
- **Print-optimized**: All outputs render correctly on US Letter paper
- **Child-friendly**: Clean fonts, colorful UI, large touch targets
- **Credits system**: Server-enforced, atomic deduction with refund on failure
- **Grade levels**: K-6 with age-appropriate vocabulary and complexity

## Build & Deploy

```bash
# Build Windows installer
npm run tauri build

# Output: src-tauri/target/release/bundle/
#   - msi/TA Teachers Assistant_0.1.0_x64_en-US.msi
#   - nsis/TA Teachers Assistant_0.1.0_x64-setup.exe
```

## Known Issues & Fixes

### Radix UI Select in Tests
- JSDOM doesn't support `hasPointerCapture` - avoid testing Select interactions in unit tests
- E2E tests work fine with `page.locator('[role="combobox"]').click()`

### Firefox E2E Timing
- Firefox has slower Supabase connection handling
- Use longer timeouts for API-dependent assertions: `toBeVisible({ timeout: 15000 })`

### CardTitle Accessibility
- shadcn/ui `CardTitle` renders as `<div>`, not a heading
- Use `getByText()` instead of `getByRole("heading")` in tests

## Archived Files

The `archive/` directory contains old project files from a previous implementation. These are not used by TA and should not be referenced for new development.
