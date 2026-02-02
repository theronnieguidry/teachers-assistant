---
name: project-snapshot
description: Generate comprehensive project state document with architecture, features, and verification status
---

# Project Snapshot Skill

You are generating a **comprehensive project state document** for TA Teachers Assistant. This document is designed for external AI reviewers (Nova/ChatGPT), contractors, or future maintainers to assess exactly what is implemented today vs what is planned, without ambiguity.

## Core Purpose

This snapshot must reliably capture:
1. **How high-quality outputs are produced** (deterministic pipeline)
2. **Persistence of Intent** (credits must matter, outputs must be great for K–3)
3. **Premium Generation Traceability** (plan → validate → assemble → qa → persist)

## Output Location

**CRITICAL**: The output document MUST be written to the user's Claude plans directory:
```
C:\Users\ronni\.claude\plans\TA-Project-Snapshot-{YYYY-MM-DD}.md
```

At the end of execution, display the full path to the user.

---

## Status Level Definitions

Use these status levels consistently throughout the document (NEVER use Yes/No):

| Status | Meaning |
|--------|---------|
| ✅ **Verified** | Proven end-to-end by artifact + logs + test pass |
| 🟡 **Configured** | Implementation exists but not validated |
| ⚠️ **Partial** | Only some paths validated |
| 🔴 **Missing** | Not implemented |

---

## Evidence Requirements

For every feature marked ✅ **Verified**, include at least ONE of:
- **File path(s)**: `path/to/file.ts (functionName)`
- **UI screenshot**: filename
- **Log snippet**: copy/paste
- **Test**: test name + passing command

---

## Execution Process

### Phase 1: Gather Project Metadata

```bash
# Get current version
node -p "require('./package.json').version"

# Get last commit date and SHA
git log -1 --format="%ci %H"

# Get current branch and status
git branch --show-current
git status --porcelain | head -20

# Get last tag (release)
git describe --tags --abbrev=0 2>/dev/null || echo "No tags"

# Count recent commits (last 30 days)
git rev-list --count --since="30 days ago" HEAD
```

### Phase 2: Gather Test Coverage Data

```bash
# Count frontend tests (use Grep tool)
grep -r "it\(" src/__tests__/ --include="*.test.tsx" --include="*.test.ts" | wc -l

# Count API tests
grep -r "it\(" generation-api/src/__tests__/ --include="*.test.ts" | wc -l

# Count E2E tests
grep -r "test\(" e2e/ --include="*.spec.ts" | wc -l

# Check for flaky tests (look for .skip or known flaky markers)
grep -r "\.skip\|flaky" e2e/ --include="*.spec.ts"
```

### Phase 3: Analyze Codebase Structure

Use Glob and Read tools to examine:

1. **Frontend Components**:
   - `src/components/**/*.tsx` - List all component files
   - `src/stores/*.ts` - List all Zustand stores
   - `src/services/*.ts` - List all service files

2. **Backend API**:
   - `generation-api/src/routes/*.ts` - List all endpoints
   - `generation-api/src/services/*.ts` - List all services

3. **Database Schema**:
   - `supabase/migrations/*.sql` - Read migration files for table definitions

4. **Tauri Commands**:
   - `src-tauri/src/commands/*.rs` - List all Rust commands

5. **Configuration**:
   - `tauri.conf.json` - Get app version, updater config
   - `CLAUDE.md` - Get environment variables and project info

6. **AI Provider Configuration**:
   - `generation-api/src/services/ai-provider.ts` - Confirm Premium = OpenAI only

### Phase 3.5: Feature Overlap Analysis

Identify overlapping or duplicate user-facing features by examining:

1. **Sidebar vs Main Content Mapping**:
   - List every sidebar panel (`src/components/panels/`, `src/components/design-packs/`)
   - List every main content tab (`src/components/layout/MainContent.tsx`)
   - For each, note: backing store, data storage (Supabase vs local), and whether it connects to the generation wizard

2. **Store Consumer Analysis**:
   - For each Zustand store, grep for `use{StoreName}` across all components
   - Flag stores with `selected*` or `current*` state that no wizard/generation component reads
   - This identifies "dead-end" features (UI exists but data flow is broken)

3. **Wizard Integration Check**:
   - Read `src/components/wizard/InspirationStep.tsx` (or equivalent) to confirm which stores it imports
   - Cross-reference against all sidebar features that collect user input
   - Any sidebar feature that collects data but isn't read by the wizard is a gap

4. **Shared Code Pattern Detection**:
   - Search for identical utility functions duplicated across components:
     ```bash
     grep -rn "readFileAsBase64\|getIcon" src/components/ --include="*.tsx"
     ```
   - Flag functions that appear in 2+ files with identical signatures

5. **Data Flow Completeness**:
   - For each feature pair, trace: UI input → store action → wizard consumption → API request
   - Document where the chain breaks (if anywhere)

**Output**: Populate Section 19 of the snapshot document with findings.

### Phase 4: Feature Verification

For each feature, check for evidence of implementation:

| Feature | Check Method | Evidence Type |
|---------|--------------|---------------|
| Authentication | `authStore.ts`, login/signup components | File + Tests |
| Wizard Steps | Count wizard step components | File + Tests |
| AI Providers | Check `ai-provider.ts` for supported providers | File |
| Credits System | Credits routes, Supabase functions | File + Tests |
| Inspiration System | `inspirationStore.ts`, inspiration components | File + Tests |
| PDF Export | PDF route in API | File + Tests |
| Auto-Updates | `tauri.conf.json` updater config | Config |
| Stripe Integration | Checkout routes, webhook handler | File + Tests |

### Phase 5: Premium Pipeline Analysis

Examine the premium generation flow:

1. **Generation Modes**:
   - `generation-api/src/services/generator.ts` - Check for mode differentiation
   - `generation-api/src/services/premium/` - Check for premium-specific services

2. **Pipeline Stages**:
   - Look for SSE event names in `generator.ts`
   - Check for stage transitions (plan → validate → assemble → qa)
   - Verify refund logic on failures

3. **Quality Gates**:
   - Check validation functions for hard/soft fail conditions
   - Look for K-3 grade constraint enforcement

4. **Template Registry**:
   - `generation-api/src/prompts/templates.ts` - Standard templates
   - `generation-api/src/prompts/premium-templates.ts` - Premium templates
   - Document template IDs and versioning

5. **Credits Lifecycle**:
   - `generation-api/src/services/credits.ts` - reserve/deduct/refund functions
   - `supabase/migrations/*.sql` - Database functions for credits

### Phase 6: PRD Traceability Check

Cross-reference implemented features against planned PRDs:
- Check GitHub issues/milestones for PRD status
- Verify file mappings for each PRD
- Count tests per feature area

### Phase 7: Generate Document

Create the document using the template below, filling in actual values discovered during analysis.

---

## Document Template

```markdown
# TA Teachers Assistant - Project State Snapshot

## Environment Metadata

| Field | Value |
|-------|-------|
| **Generated** | {YYYY-MM-DD HH:MM} |
| **TA Version** | {version from package.json} |
| **Desktop Build Type** | dev / staging / prod |
| **Generation API URL** | localhost:3001 (dev) / {hosted URL} (prod) |
| **Supabase Project Ref** | {from VITE_SUPABASE_URL or note "local"} |
| **Payment Provider Mode** | test / live |
| **Branch** | {current git branch} |
| **Last Commit** | {SHA} ({date}) |
| **Repository** | https://github.com/theronnieguidry/teachers-assistant |
| **Maintainer** | Ronnie Guidry |
| **MVP Grade Range** | **K-3** |
| **Soft-Limit (Allowed, Not Guaranteed)** | **K-6** |

> **Grade Policy**: K-3 outputs are fully supported + regression-tested; K-6 is best-effort until templates are expanded.

---

## Persistence of Intent (Non-Negotiable)

TA exists to help overwhelmed parents and under-resourced educators create K–3 materials that are print-ready and teachable.
Premium credits must never feel wasted.

**Engineering Contract (must remain true across refactors):**
- Premium outputs must be high quality for K–3 (fully supported, regression-tested).
- Premium credits are protected: estimate → reserve → validate → deduct only on quality pass → refund on failure.
- Generation must be deterministic: Plan → Validate → Assemble → Final QA → Persist.
- Teachers never see model names or token math; the UX presents "Best Results" only.

**Contract Status:** {✅ In effect / 🟡 Partially implemented / 🔴 Not implemented}

**Evidence:**
- Reserve/Deduct/Refund: `generation-api/src/services/credits.ts`
- Pipeline stages: `generation-api/src/services/generator.ts`
- UX abstraction: `src/components/wizard/AIProviderStep.tsx`

---

## Known Gaps / TODO Summary

| Priority | Issue | Owner |
|----------|-------|-------|
| P0 | {Critical blocker} | {team} |
| P1 | {Important gap} | {team} |
| P2 | {Nice to have} | {team} |

---

## Release Readiness

### Status Scale
| Status | Meaning |
|--------|---------|
| ✅ **Verified on clean machine** | Fresh Windows user, no dev tools installed |
| 🟡 **Release-ready** | Signed artifacts exist, QA checklist complete |
| ⚠️ **Buildable** | Installer builds via `tauri build`, but not QA'd end-to-end |
| 🔴 **Not ready** | Cannot produce installer |

### Current Status
**Status**: {✅/🟡/⚠️/🔴}

**Evidence for Install Readiness:**
- **Installer artifact name**: `{filename, e.g., TA_0.1.0_x64_en-US.msi}`
- **Artifact location**: `{GitHub Release URL or local path}`
- **Clean-machine install test date**: `{date or "Not tested"}`
- **Clean-machine install notes**: `{notes or "N/A"}`
- **No terminal required confirmation**: `{Yes / No / Unverified}`

---

## Quick Verdict (Reviewer Summary)

| Question | Status | Evidence |
|----------|--------|----------|
| Can a teacher install TA today? | ✅/🟡/⚠️/🔴 | {artifact name} |
| Can they generate K-3 worksheets? | ✅/🟡/⚠️/🔴 | {file/test} |
| Can they use free local AI (Ollama)? | ✅/🟡/⚠️/🔴 | {file/test} |
| Can they use Premium AI (OpenAI)? | ✅/🟡/⚠️/🔴 | {file/test} |
| Can they purchase credits? | ✅/🟡/⚠️/🔴 | {file/test} |
| Do auto-updates work? | ✅/🟡/⚠️/🔴 | {config} |
| Do credits reserve/refund correctly? | ✅/🟡/⚠️/🔴 | {file/test} |
| Is design inspiration multimodal? | ✅/🟡/⚠️/🔴 | {file/test} |

---

## Generation Modes

### Mode A — Free (Local)
- **Provider**: Ollama
- **Inputs**: Wizard prompt + inspiration summary
- **Output**: HTML artifacts
- **Visuals**: placeholder / none
- **Credits**: none
- **K–3 Hardened**: {✅/🟡/🔴}
- **Prompts**: `generation-api/src/prompts/templates.ts`

### Mode B — Premium Worksheet (OpenAI)
- **Pipeline**: Plan → Validate → HTML Assemble → Image Gen → Final QA → Persist
- **Visuals**: OpenAI image generation (configurable richness)
- **Credits**: estimate → reserve → deduct on QA pass → refund on failure
- **K–3 Hardened**: {✅/🟡/🔴}
- **Prompts**: `generation-api/src/prompts/templates.ts`, `generation-api/src/prompts/premium-templates.ts`

### Mode C — Premium Lesson Plan (OpenAI)
- **Pipeline**: Objective selection → Plan → Validate → Assemble → QA → Persist
- **Novice Mode**: teacher script always included when enabled
- **Credits**: estimate → reserve → deduct on QA pass → refund on failure
- **K–3 Hardened**: {✅/🟡/🔴}

### Mode D — Premium Remediation Pack (OpenAI)
- **Trigger**: mastery = Needs Review OR "Make it better"
- **Pipeline**: mistake-targeted practice + simplified explanation + coaching
- **Status**: {✅ Implemented / 🟡 In Progress / 🔴 Not Started}

---

## Premium Pipeline Stages (Deterministic)

| Stage | Description | SSE Event | Status |
|-------|-------------|-----------|--------|
| 1. Estimate | Fast cost preview | `estimate` | {✅/🟡/🔴} |
| 2. Reserve | Lock credits atomically | `reserving` | {✅/🟡/🔴} |
| 3. Plan | Generate JSON contract | `planning` | {✅/🟡/🔴} |
| 4. Validate | Repair plan once if needed | `validating` | {✅/🟡/🔴} |
| 5. Assemble | Generate HTML outputs | `generating` | {✅/🟡/🔴} |
| 6. Images | Generate images (if enabled) | `imaging` | {✅/🟡/🔴} |
| 7. Final QA | Quality gate check | `qa` | {✅/🟡/🔴} |
| 8. Persist | Store outputs + metadata | `persisting` | {✅/🟡/🔴} |
| 9. Deduct | Deduct credits (only after QA pass) | `complete` | {✅/🟡/🔴} |
| 10. Refund | Refund credits on failure | `error` | {✅/🟡/🔴} |

**Key Files:**
- Pipeline orchestration: `generation-api/src/services/generator.ts`
- Credits lifecycle: `generation-api/src/services/credits.ts`
- Premium templates: `generation-api/src/prompts/premium-templates.ts`

---

## Premium Quality Gates

### Hard Fails (refund credits automatically)
- Missing required sections (objective, instructions, student activity)
- Answer key missing when enabled
- Invalid plan schema or unparseable output
- Image generation missing for required slots (when visuals enabled)
- Provider/API failure

### Soft Fails (allow 'Make it better' loop)
- Style drift across images
- Minor wording confusion
- Slightly too hard/easy for grade (within soft-limit)

### K–3 Grade Constraints

| Grade | Core Expectations | Vocabulary | Math Rules |
|-------|------------------|------------|------------|
| K | Letter recognition, counting 1-20 | Simple, concrete | Addition within 5 |
| 1 | CVC words, addition/subtraction within 20 | Short sentences | Place value to 100 |
| 2 | Multi-syllable words, 2-digit arithmetic | Grade-level vocabulary | Addition/subtraction within 100 |
| 3 | Paragraphs, multiplication intro | Expanding vocabulary | Multiplication/division facts |

**Enforcement:** These constraints are enforced in:
- `generation-api/src/prompts/templates.ts` (prompt templates)
- `generation-api/src/services/generator.ts` (validation logic)

---

## Credits Lifecycle (Premium)

```
1. Estimate shown in UI (before generation)
2. Reserve credits at job start
3. Generate in stages
4. QA pass required to settle charge
5. Deduct credits only after QA pass
6. Auto-refund on hard failures
```

**User Promise:** Premium credits are never consumed for broken outputs.

### Evidence Requirements
| Function | File | Purpose |
|----------|------|---------|
| `reserveCredits()` | `generation-api/src/services/credits.ts` | Lock credits atomically |
| `deductCredits()` | `generation-api/src/services/credits.ts` | Finalize charge after QA |
| `refundCredits()` | `generation-api/src/services/credits.ts` | Return credits on failure |
| `reserve_credits()` | `supabase/migrations/*.sql` | Database function |
| `refund_credits()` | `supabase/migrations/*.sql` | Database function |

---

## Prompt Template Registry

| Template ID | Used By | Inputs | Output Contract | K-3 Hardened |
|-------------|---------|--------|-----------------|--------------|
| `worksheet_plan_v1` | Premium Worksheet | grade/subject/difficulty | JSON Plan | {✅/🟡/🔴} |
| `worksheet_html_v1` | Premium Worksheet | JSON Plan + style | HTML | {✅/🟡/🔴} |
| `lesson_plan_plan_v1` | Premium Lesson Plan | objective + novice mode | JSON Plan | {✅/🟡/🔴} |
| `remediation_pack_v1` | Remediation | wrong answers summary | HTML pack | {✅/🟡/🔴} |
| `image_prompt_cartoon_v1` | Image Gen | question intent | image prompt | {✅/🟡/🔴} |

**Template Locations:**
- Standard templates: `generation-api/src/prompts/templates.ts`
- Premium templates: `generation-api/src/prompts/premium-templates.ts`

**Versioning Scheme:** Templates use `_v{n}` suffix for breaking changes.

---

## PRD Traceability

| PRD | Status | Key Requirements | Files / Modules | Tests | Notes |
|-----|--------|------------------|-----------------|-------|-------|
| Premium Worksheets (OpenAI + Images) | {✅/🟡/🔴/⚠️} | plan→validate→qa | `generator.ts`, `premium-templates.ts` | {count} | |
| Premium Lesson Plans (K–3) | {✅/🟡/🔴/⚠️} | novice script | `generator.ts` | {count} | |
| Learning Path + Mastery Tracker | {✅/🟡/🔴/⚠️} | quick check → mastery | TBD | {count} | |
| Improve/Polish Feature | {✅/🟡/🔴/⚠️} | "Make it better" | `improve.ts` | {count} | |
| Stripe Integration | {✅/🟡/🔴/⚠️} | checkout + webhooks | `checkout.ts` | {count} | |

**Status Legend:**
- ✅ Done (verified)
- 🟡 In Progress
- 🔴 Not Started
- ⚠️ Draft only

---

## 1. Project Identity & Packaging

### 1.1 App Basics
- **App Name**: TA (Teacher's Assistant)
- **App Identifier**: `com.ta.teachers-assistant`
- **Target Users**: Homeschool parents + elementary educators (K-3 MVP)
- **Supported OS**:
  - [x] Windows (MSI, NSIS)
  - [ ] macOS (planned)
  - [ ] Linux (planned)

### 1.2 Installer / Build
- **Framework**: Tauri v2
- **Build Command**: `npm run tauri build`
- **Output Artifacts**:
  - Windows MSI: `src-tauri/target/release/bundle/msi/*.msi`
  - Windows NSIS: `src-tauri/target/release/bundle/nsis/*-setup.exe`
- **NSIS Customization**: Ollama auto-install page (`nsis/installer-hooks.nsh`)

### 1.3 Auto-Update Configuration
- **Enabled**: {✅/🔴}
- **Endpoint**: `https://github.com/theronnieguidry/teachers-assistant/releases/latest/download/latest.json`
- **Signature Verification**: Minisign
- **Evidence**: `tauri.conf.json:plugins.updater`

---

## 2. Production Runtime Modes

| Mode | Used By | Generation API Location | Premium Secrets Location | Notes |
|------|---------|------------------------|-------------------------|-------|
| **Dev Mode** | Developers | `localhost:3001` | local `.env` | Full access |
| **Teacher Mode (Production)** | Educators | **hosted remote API** | **server-side only** | Recommended |
| **Local-only Mode** | Educators (offline) | local Ollama only | none | Free only, no premium |

**Current Mode**: {Dev / Teacher / Local-only}

### Generation API Lifecycle (Teacher Install)

- **How API starts**: {bundled background process / separate service / remote only}
- **Healthcheck path**: `GET /health`
- **Crash recovery**: {restart strategy}
- **Error UI if API down**: {yes/no, describe}

---

## 2.5 Premium Secret Ownership Model (Production Decision)

**CRITICAL**: Premium secrets (`OPENAI_API_KEY`, `STRIPE_SECRET_KEY`) must NEVER live on teacher machines.

### Deployment Options

| Option | Description | Premium Secrets Location | Recommended |
|--------|-------------|-------------------------|-------------|
| **A: Hybrid Mode** | Local-only generation (free) via Ollama + Premium via TA-hosted remote API | Server-side only | ✅ Yes |
| **B: Fully Remote** | All generation hits remote API; Ollama optional/offline | Server-side only | Acceptable |
| **C: Fully Local** | Premium secrets stored on teacher machine | Local `.env` | ❌ Not recommended |

### Current Configuration

| Field | Value |
|-------|-------|
| **Current Mode** | {Hybrid / Remote / Local-only} |
| **Target Mode** | {Hybrid / Remote / Local-only} |
| **Teacher machine stores premium secrets?** | {Yes / No} |

### Premium API Base URLs

| Environment | URL |
|-------------|-----|
| **dev** | `http://localhost:3001` |
| **staging** | `{staging URL or "N/A"}` |
| **prod** | `{production URL or "N/A"}` |

### Health & Downtime

- **Healthcheck endpoint**: `GET /health`
- **Downtime UX behavior**: "{What teacher sees when API is unavailable, e.g., 'Premium services are temporarily unavailable. Local mode still works.'}"

---

## 3. Feature Truth Table

| Feature | Status | Files | Tests | Evidence |
|---------|--------|-------|-------|----------|
| **Authentication** | | | | |
| Email/password login | ✅/🟡/⚠️/🔴 | `LoginForm.tsx` | {count} | {test name} |
| Email/password signup | ✅/🟡/⚠️/🔴 | `SignupForm.tsx` | {count} | |
| OAuth (Google/Apple) | ✅/🟡/⚠️/🔴 | `OAuthButtons.tsx` | {count} | |
| **Wizard** | | | | |
| Step 1: Class Details | ✅/🟡/⚠️/🔴 | `ClassDetailsStep.tsx` | {count} | |
| Step 2: Inspiration | ✅/🟡/⚠️/🔴 | `InspirationStep.tsx` | {count} | |
| Step 3: Prompt Review | ✅/🟡/⚠️/🔴 | `PromptReviewStep.tsx` | {count} | |
| Step 4: AI Provider | ✅/🟡/⚠️/🔴 | `AIProviderStep.tsx` | {count} | |
| Step 5: Output Options | ✅/🟡/⚠️/🔴 | `OutputStep.tsx` | {count} | |
| Step 6: Generation | ✅/🟡/⚠️/🔴 | `GenerationStep.tsx` | {count} | |
| **AI Providers** | | | | |
| Premium (OpenAI) | ✅/🟡/⚠️/🔴 | `ai-provider.ts` | {count} | gpt-4o |
| Local (Ollama) | ✅/🟡/⚠️/🔴 | `ai-provider.ts` | {count} | llama3.2 |
| **Credits System** | | | | |
| Credit balance display | ✅/🟡/⚠️/🔴 | `Header.tsx` | {count} | |
| Reserve/deduct credits | ✅/🟡/⚠️/🔴 | `credits.ts` | {count} | |
| Refund on failure | ✅/🟡/⚠️/🔴 | `credits.ts` | {count} | |
| **Payment** | | | | |
| Stripe Checkout | ✅/🟡/⚠️/🔴 | `checkout.ts` | {count} | |
| Webhook handler | ✅/🟡/⚠️/🔴 | `checkout.ts` | {count} | |
| **Output** | | | | |
| HTML preview | ✅/🟡/⚠️/🔴 | `PreviewTabs.tsx` | {count} | |
| PDF export | ✅/🟡/⚠️/🔴 | `pdf.ts` | {count} | |
| Local file save | ✅/🟡/⚠️/🔴 | `tauri-bridge.ts` | {count} | |
| **Other** | | | | |
| Auto-updates | ✅/🟡/⚠️/🔴 | `UpdateDialog.tsx` | {count} | |
| Feedback submission | ✅/🟡/⚠️/🔴 | `FeedbackDialog.tsx` | {count} | |
| Ollama management UI | ✅/🟡/⚠️/🔴 | `OllamaSetup.tsx` | {count} | |

---

## 4. Teacher Experience Acceptance Checklist

| Scenario | Status | Evidence |
|----------|--------|----------|
| Install app (no terminal required) | ✅/🟡/🔴 | {artifact name + screenshot} |
| Launch + sign in | ✅/🟡/🔴 | |
| Generate Local AI worksheet (K-3) | ✅/🟡/🔴 | |
| Generate Premium AI worksheet | ✅/🟡/🔴 | |
| Export PDF and print | ✅/🟡/🔴 | |
| Credits run out → purchase → credits appear | ✅/🟡/🔴 | |

---

## 5. Wizard Step-by-Step (As Implemented)

### Step 1: Class Details
**Fields shown**:
- Grade: K, 1, 2, 3, 4, 5, 6
- Subject: Math, Reading, Science, Social Studies, Writing, Art
- Difficulty: Easy, Medium, Hard
- Output types: Worksheet, Lesson Plan, Answer Key

**Soft-limit behavior (grade > 3)**:
- Warning shown: {yes/no}
- Copy: "{paste exact warning text}"

**Evidence**: `ClassDetailsStep.tsx`

### Step 2: Inspiration
**Supported inputs**:
- [x] URL
- [x] PDF
- [x] Image (PNG/JPG/WebP)
- [x] Drag & drop
- [x] File picker

**Evidence**: `InspirationStep.tsx`, `inspiration-parser.ts`

### Step 3: Prompt Review
**Features**:
- [x] AI Polish toggle
- [x] Preview of final prompt

**AI Polish behavior**: Uses Ollama (free) for prompt enhancement

**Evidence**: `PromptReviewStep.tsx`, `prompt-polisher.ts`

### Step 4: AI Provider Selection
**Options shown**:
- [ ] Local AI (Free) - Ollama
- [ ] Premium AI (Best results) - OpenAI

**Warning for Ollama + image inspiration**: {yes/no}

**Evidence**: `AIProviderStep.tsx`

### Step 5: Output Options
**Features**:
- [x] Output folder selection (native dialog)
- [x] File naming preview

**Evidence**: `OutputStep.tsx`

### Step 6: Generation
**Features**:
- [x] Progress indicator
- [x] SSE streaming
- [x] Error handling with user-friendly messages

**Evidence**: `GenerationStep.tsx`

---

## 6. API Contracts

### 6.1 POST /generate Request
```json
{
  "title": "Math Addition Worksheet",
  "prompt": "Create a worksheet about single-digit addition for 1st graders...",
  "classDetails": {
    "grade": "1",
    "subject": "Math",
    "difficulty": "Easy",
    "outputTypes": ["worksheet", "answerKey", "lessonPlan"]
  },
  "provider": "local",
  "model": "llama3.2",
  "inspiration": [
    {
      "id": "local_123",
      "type": "url",
      "title": "Sample worksheet",
      "source": "https://example.com/worksheet.pdf",
      "extractedContent": "..."
    }
  ]
}
```

### 6.2 SSE Response Events
```
event: status
data: {"stage":"reserving","message":"Reserving credits..."}

event: status
data: {"stage":"parsing","message":"Analyzing inspiration..."}

event: status
data: {"stage":"generating","message":"Creating worksheet..."}

event: complete
data: {"projectId":"uuid","versionId":"uuid"}

event: error
data: {"message":"Generation failed","code":"CREDIT_ERROR"}
```

---

## 7. Credits + Billing Edge Cases

| Case | Expected Behavior | Owner | Status |
|------|-------------------|-------|--------|
| Webhook delivered twice | Idempotent grant (no duplicate credits) | BE/DB | ✅/🟡/🔴 |
| Checkout succeeds, credits delayed | Polling + "Processing" UI | FE/BE | ✅/🟡/🔴 |
| Premium generation fails after reserve | Refund unused credits | BE/DB | ✅/🟡/🔴 |
| User tries Premium with 0 credits | Block + "Add Credits" CTA | FE | ✅/🟡/🔴 |
| User retries generation | Idempotency key prevents double-charge | BE | ✅/🟡/🔴 |

### Credit Calculation
```
creditsUsed = ceil((inputTokens + outputTokens) / 1000)
```

> **Pricing Intent**: 1 credit ≈ 1K tokens (input+output). Pack pricing aims for ~{X}% gross margin after provider costs. *(Margin target TBD if not yet set before public launch.)*

### Credit Packs
| Pack | Credits | Price | Cost/Credit |
|------|--------:|------:|------------:|
| Starter | 100 | $5 | $0.05 |
| Value | 500 | $20 | $0.04 |
| Pro | 1000 | $35 | $0.035 |

---

## 8. Prompt Assembly (Truth Prompt)

### Stage Order
1. **Inspiration extraction** - Parse URLs, PDFs, images
2. **AI Polish** (if enabled) - Ollama rewrites user prompt
3. **Final generation** - OpenAI/Ollama generates HTML
4. **Visual injection** - `[VISUAL: description]` → Pixabay images
5. **PDF export** (if requested)

### Template Location
`generation-api/src/prompts/templates.ts`

### Example Final Prompt (Sanitized)
```
SYSTEM: You are TA, a teacher's assistant helping create K-3 educational materials.

GRADE LEVEL: 1st Grade (ages 6-7)
- Simple vocabulary with occasional new words introduced
- Sentences up to 10 words
- Math: addition/subtraction within 20, place value to 100

DIFFICULTY: Easy
- Use simple vocabulary and straightforward problems
- Provide extra scaffolding and hints

OUTPUT FORMAT: Printable HTML worksheet

USER REQUEST:
Create a worksheet about single-digit addition...

DESIGN INSPIRATION:
[Extracted design notes from provided materials]
```

---

## 9. Inspiration Extraction Contract

### File Upload Mechanics

**How do local files reach the Generation API?**

When a user adds a PDF/image from disk, TA:
- [ ] Uploads bytes as multipart/form-data
- [x] Base64 embeds into JSON request
- [ ] Extracts locally (text + style) then sends extracted summary only
- [ ] Sends a local file path (only possible in "local API mode")

### Payload Examples

**1. URL Inspiration Item:**
```json
{
  "inspiration": [
    {
      "type": "url",
      "value": "https://example.com/sample-worksheet.html"
    }
  ]
}
```

**2. File PDF Inspiration Item:**
```json
{
  "inspiration": [
    {
      "type": "file_pdf",
      "filename": "worksheet.pdf",
      "mimeType": "application/pdf",
      "bytesBase64": "<base64-encoded-pdf-bytes>"
    }
  ]
}
```

**3. File Image Inspiration Item:**
```json
{
  "inspiration": [
    {
      "type": "file_image",
      "filename": "style.png",
      "mimeType": "image/png",
      "bytesBase64": "<base64-encoded-image-bytes>"
    }
  ]
}
```

### Extraction Output Schema
```json
{
  "palette": ["#FF5733", "#33FF57", "#3357FF"],
  "typography": ["Arial", "Comic Sans MS"],
  "layoutNotes": "Two-column layout with large margins",
  "toneTags": ["playful", "cartoon", "colorful"],
  "illustrationStyle": "flat-cartoon"
}
```

### Limits
| Type | Max Size | Max Count | Timeout | Notes |
|------|----------|-----------|---------|-------|
| URL | N/A | {count} | {seconds}s | Screenshot taken |
| PDF | {size}MB | {count} pages | {seconds}s | Rendered to images |
| Image | {size}MB | {count} | {seconds}s | Resized to max 1200px |

### Fallback Behavior
If vision analysis fails:
- [ ] Fall back to text-only extraction
- [ ] Continue with content-only generation
- [ ] Show warning to user

**Evidence**: `inspiration-parser.ts`

---

## 10. Output Artifact Contract

### Folder Structure
```
<TA Outputs>/<Project Title>/
  worksheet_v1.html
  answer_key_v1.html
  lesson_plan_v1.html
  worksheet_v1.pdf
  metadata.json
  assets/
    img_001.png
    img_002.png
```

### Naming Rules
- Version number: `_v{n}` suffix
- Sanitized title: spaces → underscores, special chars removed

### Versioning Rules
- Each regeneration increments version number
- Previous versions preserved

### Asset Handling
- Images: {embedded base64 / linked local files}
- CSS: {inline / linked}

---

## 10.5 Image Generation Storage Contract

### Overview
Premium AI will eventually generate images (replacing Pixabay). This section documents where generated images are stored.

### Storage Configuration

| Field | Value |
|-------|-------|
| **Storage location** | {Local disk under project/assets / Supabase Storage bucket / Hybrid (local cache + cloud)} |
| **Project version association** | Images stored per `project_version_id` |
| **Caching/dedup strategy** | {Content hash / Deterministic name / None} |

### Re-run Behavior
When a user regenerates a project:
- [ ] Regenerate all images fresh
- [ ] Reuse existing images if prompt unchanged
- [ ] Ask user preference

### Offline Fallback
If premium image generation fails:
- [ ] Keep `[VISUAL: description]` placeholders
- [ ] Fall back to Pixabay
- [ ] Show error to user

### Future Hook
`ImageService` interface supports adapters:
- `PixabayAdapter` (current)
- `OpenAIImageAdapter` (planned)

---

## 11. Testing Inventory

### Test Counts
| Suite | Count | Location |
|-------|------:|----------|
| Frontend Unit | {count} | `src/__tests__/` |
| API Unit | {count} | `generation-api/src/__tests__/` |
| E2E (Playwright) | {count} | `e2e/` |
| **Total** | **{total}** | |

### Test Metadata
- **Last CI Green Commit**: {SHA}
- **Last Local Full Test Run**: {timestamp}
- **Flaky E2E Tests**: {none / list}

### Test Commands
```bash
# Frontend unit tests
npm run test:run

# API unit tests
cd generation-api && npm run test:run

# E2E tests (all browsers)
npx playwright test

# E2E (Chromium only)
npx playwright test --project=chromium
```

---

## 12. Privacy + "Never Store" Rules (Education Safety)

### Core Education Safety Rules
1. **Never prompt users to enter real student names** - Use generic names or placeholders
2. **Avoid retaining inspiration uploads beyond project necessity** - Process and discard
3. **Redact emails/keys/PII from logs** - Sanitize before logging
4. **Clarify retention policy** in user-facing documentation

### Data Handling Policy
| Data Type | Stored? | Location | Retention |
|-----------|---------|----------|-----------|
| Student names | ❌ Never | N/A | N/A |
| Real student PII | ❌ Never | N/A | N/A |
| User email | ✅ Yes | Supabase auth | Account lifetime |
| Generated content | ✅ Yes | Supabase + local | User-controlled |
| Inspiration uploads | ⚠️ Temp | Server memory | Request duration only |
| API keys | ✅ Yes | Server env only | Never in client |

### Retention Policy

| Storage Type | Location | Retention |
|--------------|----------|-----------|
| Local files | Project folder on disk | User-controlled (permanent until deleted) |
| Remote data | Supabase database | {expire after X days / keep forever / user-controlled} |
| Inspiration uploads | Server memory | Deleted after request completes |

### Logging Redaction Policy
- User prompts: {logged / redacted}
- Generated content: {logged / redacted}
- API responses: {logged / redacted}
- Emails/API keys: ❌ Always redacted

### Supabase Storage Policy
- Retention: {expire after X days / keep forever / user-controlled}

---

## 13. Environment Configuration

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GENERATION_API_URL=http://localhost:3001
```

### Generation API (.env)
```env
PORT=3001

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI Providers (Premium = OpenAI only)
OPENAI_API_KEY=sk-proj-...

# Local AI (free)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Payments (use sk_test_ for development/docs, never sk_live_ in examples)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...

# Optional
PIXABAY_API_KEY=your-key
```

> **IMPORTANT**: Production secrets must never appear in docs, commits, screenshots, or logs.

---

## 14. Legacy Compatibility

### Historical Data Handling
- `project_versions` rows with `ai_provider=claude`: Preview supported
- Incoming requests specifying legacy provider: Remapped to OpenAI
- New writes: Never contain legacy provider values

### Migration Notes
- Claude/Anthropic removed from runtime in favor of OpenAI
- Existing Claude-generated content remains viewable
- No data migration required

---

## 15. Open Questions

### Product Questions
- What is the first "default" project type?
- Are answer keys always required?
- Should Premium default on?

### Technical Questions
- Premium generation API: Remote hosted today? Transition plan?
- Offline support policy: Local-only mode without account?
- What features degrade offline?

---

## 16. Intent Persistence Checklist (Self-Audit)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MVP grade range is K–3 everywhere (soft-limit K–6) | {✅/🔴} | |
| Premium credits are protected (estimate → reserve → QA → deduct/refund) | {✅/🔴} | |
| Premium uses deterministic pipeline (Plan → Validate → Assemble → QA) | {✅/🔴} | |
| Teacher never sees model names/tokens | {✅/🔴} | |
| Worksheets include answer keys with explanations | {✅/🔴} | |
| Lesson plans include novice teacher script when selected | {✅/🔴} | |
| Learning path can recommend "what's next" | {✅/🔴} | |
| Quick check updates mastery state correctly | {✅/🔴} | |

**If any unchecked:**
- What's missing: {description}
- Next step: {action item}

---

## 17. Evidence Pack (For Verification)

### Required Examples

**1. Example /estimate request + response (Premium worksheet):**
```json
// Request
{
  "provider": "premium",
  "classDetails": { "grade": "2", "subject": "Math", "outputTypes": ["worksheet"] }
}

// Response
{
  "estimatedCredits": 5,
  "breakdown": { "generation": 3, "images": 2 }
}
```
**Status:** {Present / Missing}

**2. Example /generate SSE event stream snippet:**
```
event: status
data: {"stage":"reserving","message":"Reserving 5 credits..."}

event: status
data: {"stage":"generating","message":"Creating worksheet..."}

event: complete
data: {"projectId":"uuid","versionId":"uuid"}
```
**Status:** {Present / Missing}

**3. Example output folder tree (after run):**
```
<TA Outputs>/Math_Addition_Worksheet/
  worksheet_v1.html
  answer_key_v1.html
  metadata.json
  assets/
    img_001.png
```
**Status:** {Present / Missing}

**4. Example metadata.json:**
```json
{
  "objective": "Practice single-digit addition",
  "grade": "1",
  "subject": "Math",
  "imagesCount": 3,
  "generatedAt": "2026-01-25T10:30:00Z"
}
```
**Status:** {Present / Missing}

---

## 18. Key Files Reference

| Category | File | Purpose |
|----------|------|---------|
| **Entry Points** | | |
| Frontend | `src/main.tsx` | React app entry |
| Tauri | `src-tauri/src/main.rs` | Tauri entry |
| API | `generation-api/src/index.ts` | API entry |
| **Core Logic** | | |
| Wizard State | `src/stores/wizardStore.ts` | 6-step wizard state machine |
| AI Provider | `generation-api/src/services/ai-provider.ts` | OpenAI/Ollama abstraction |
| Generator | `generation-api/src/services/generator.ts` | Generation orchestration |
| Credits | `generation-api/src/services/credits.ts` | Reserve/deduct/refund |
| Premium Pipeline | `generation-api/src/services/premium/` | Deterministic premium stages |
| **Templates** | | |
| Standard Prompts | `generation-api/src/prompts/templates.ts` | K-3 content guidelines |
| Premium Prompts | `generation-api/src/prompts/premium-templates.ts` | Premium generation templates |
| **Configuration** | | |
| Tauri | `tauri.conf.json` | Desktop config, updater |

---

## 19. Feature Overlap & Consolidation Analysis

This section documents user-facing features that overlap, duplicate functionality, or have broken data flows. Updated each time the snapshot is generated.

### 19.1 Feature Inventory

| Feature | Sidebar | Main Tab | Store | Storage | Wizard Integration | E2E Tests |
|---------|---------|----------|-------|---------|-------------------|-----------|
| Design Inspiration | InspirationPanel (always visible) | — | `inspirationStore` | Supabase | ✅ Step 2 reads items | `inspiration.spec.ts` ({count}) |
| Design Packs | DesignPacksPanel (collapsible) | — | `designPackStore` | Local | {✅/🔴 Check if wizard reads `selectedPackId`} | `design-packs.spec.ts` ({count}) |
| Projects List | ProjectsPanel | — | `projectStore` | Supabase | N/A (navigation) | `projects.spec.ts` ({count}) |
| Project Detail | — | Projects tab | `projectStore` | Supabase | N/A (preview) | `projects.spec.ts` |
| Today View | — | Today tab | `learnerStore` | Local | Indirect (Start Lesson) | `learning-path.spec.ts` |
| Learning Path | — | Learning Path tab | `learnerStore` | Local curriculum packs | Indirect (Start Lesson) | `learning-path.spec.ts` ({count}) |
| Library | — | Library tab | `artifactStore` | Local | N/A (post-generation) | `library.spec.ts` ({count}) |
| Creation Panel | CreationPanel (top) | — | `wizardStore` | N/A | Entry point | `wizard.spec.ts` ({count}) |

### 19.2 Overlap Pair Analysis

For each pair of features with overlapping functionality:

#### Pair A: Design Inspiration vs Design Packs

| Aspect | Design Inspiration | Design Packs |
|--------|-------------------|--------------|
| **Purpose** | Collect design references (URLs, PDFs, images) | Organize design references into named packs |
| **UI Location** | Sidebar (always visible) | Sidebar (collapsible) |
| **Store** | `inspirationStore.ts` | `designPackStore.ts` |
| **Storage** | Supabase `inspiration_items` (cloud, per-user) | Local storage via `design-pack-storage.ts` |
| **Organization** | Flat list | Named containers with per-pack items |
| **Wizard Integration** | ✅ `InspirationStep.tsx` reads `useInspirationStore` | {✅/🔴 Check if any wizard component reads `useDesignPackStore`} |
| **Item Types** | URL, PDF, Image | URL, PDF, Image (identical) |
| **Shared Code** | `readFileAsBase64()`, `getIcon()`, drag/drop handlers | Same functions duplicated |

**Verdict**: {✅ Both serve distinct purposes / ⚠️ Overlap with incomplete integration / 🔴 Dead-end feature}

**Evidence**:
- InspirationStep imports: `{list actual store imports from InspirationStep.tsx}`
- Design Pack `selectedPackId` consumers: `{list components that read selectedPackId, or "none"}`

**Recommendation**: {Describe — e.g., "Wire Design Packs into wizard OR retire Inspiration in favor of Packs"}

#### Pair B: Projects Sidebar vs Projects Tab

| Aspect | Projects Sidebar | Projects Tab |
|--------|-----------------|-------------|
| **Purpose** | Navigate project list, quick actions | View selected project detail |
| **Pattern** | Master (list) | Detail (preview) |

**Verdict**: {✅ Complementary master-detail pattern / ⚠️ Missing features}

**Evidence**: `ProjectsPanel.tsx` sets `currentProject`; `MainContent.tsx` renders `ProjectPreview` when `currentProject` is set.

**Gap (if any)**: {e.g., "No bulk project management view in main content area"}

#### Pair C: Learning Path vs Library

| Aspect | Learning Path | Library |
|--------|--------------|---------|
| **Purpose** | Curriculum planning + mastery tracking | Artifact browsing + search |
| **Data** | Curriculum packs (objectives, units) | Generated artifacts (HTML, metadata) |

**Verdict**: {✅ Different purposes, no overlap / ⚠️ Missing bridge between objectives and artifacts}

**Evidence**: {e.g., "Library filters include grade/subject/type but not objective ID"}

**Gap (if any)**: {e.g., "No visible link showing which Learning Path objective produced a Library artifact"}

### 19.3 Integration Gap Matrix

| Gap | Newer Feature | What's Missing | Impact | Priority |
|-----|---------------|---------------|--------|----------|
| {gap description} | {feature name} | {what needs to be wired} | {user impact} | P0/P1/P2 |

### 19.4 Code Deduplication Targets

| Function / Pattern | Locations | Recommendation |
|-------------------|-----------|----------------|
| `readFileAsBase64()` | {list all files containing this function} | Extract to `src/lib/file-utils.ts` |
| `getIcon()` (inspiration type → icon) | {list all files containing this function} | Extract to `src/lib/inspiration-utils.ts` |
| Drag/drop handler pattern | {list all files with similar onDrop handlers} | Extract to `src/hooks/useInspirationDrop.ts` |

### 19.5 Consolidation Recommendations

| Priority | Recommendation | Affected Files | Notes |
|----------|---------------|----------------|-------|
| P0 | {e.g., Wire Design Packs into wizard OR retire} | {files} | {context} |
| P1 | {e.g., Extract shared utilities} | {files} | {context} |
| P2 | {e.g., Bridge Library ↔ Learning Path} | {files} | {context} |

---

*Document generated by `/project-snapshot` skill*
*Last updated: {timestamp}*
```

---

## Completion

After writing the document:

1. **Display the full file path** to the user:
   ```
   Project snapshot created at:
   C:\Users\ronni\.claude\plans\TA-Project-Snapshot-{YYYY-MM-DD}.md
   ```

2. **Provide a brief summary**:
   - Version analyzed
   - Feature count (✅ Verified / 🟡 Configured / ⚠️ Partial / 🔴 Missing)
   - Test count
   - Critical gaps identified (P0/P1)
   - Runtime mode identified

---

## Data Collection (If Missing)

If critical data is unavailable during analysis, request from the developer:

### Basic Evidence
1. A real `/generate` request payload containing a PDF or image
2. A successful SSE log snippet for a run using inspiration
3. A screenshot of the output folder structure after generation
4. A statement of current deployment mode (Hybrid/Remote/Local)
5. Proof of install readiness (clean machine install notes)
6. 30-100 lines of generation-api logs for a successful run
7. Test command outputs for FE/BE/E2E

### Premium Pipeline Evidence (NEW)
8. Example `/estimate` request + response for a premium worksheet
9. SSE event stream showing all pipeline stages (reserving → planning → generating → complete)
10. Example of refund log when generation fails
11. Example `metadata.json` from a completed generation
12. List of implemented vs planned template IDs

### Intent Persistence Evidence (NEW)
13. Confirmation that teacher UI never shows model names or token counts
14. Evidence of K-3 constraint enforcement (prompt snippets or validation logic)
15. PRD status for premium features (implemented/in-progress/planned)

---

## Definition of Done

The snapshot output is "complete" when:

### Core Requirements
- [ ] MVP grade range is K-3 with explicit K-6 soft-limit
- [ ] Contains NO Claude/Anthropic runtime references (only in Legacy section)
- [ ] Uses ✅ Verified / 🟡 Configured / ⚠️ Partial / 🔴 Missing statuses
- [ ] Release readiness uses strict verification levels with evidence
- [ ] Clearly states runtime mode and where premium secrets live
- [ ] Includes evidence fields for verified claims
- [ ] Includes all sections (even if some are "Missing")

### Persistence of Intent (NEW)
- [ ] "Persistence of Intent" section is present and standardized
- [ ] Engineering contract status is marked (✅/🟡/🔴)
- [ ] Generation modes are listed and correct (Free, Premium Worksheet, Premium Lesson Plan, Remediation)
- [ ] Premium pipeline stages are documented deterministically (10 stages)
- [ ] Quality gates and refund rules are explicit (hard fails vs soft fails)
- [ ] K-3 grade constraints are documented in a table
- [ ] Template registry is documented with versions
- [ ] PRD traceability table is included with status
- [ ] Intent persistence checklist exists (self-audit)
- [ ] Evidence pack section exists with examples or "Missing" markers

### Technical Requirements
- [ ] Premium secret ownership model is explicit (Hybrid recommended)
- [ ] File upload mechanics are documented with payload examples
- [ ] `.env` examples are safe (`sk_test_` placeholders only)
- [ ] Credits lifecycle is explicit (estimate → reserve → QA → deduct/refund)
- [ ] Credits pricing includes margin intent sentence
- [ ] Image generation storage/ownership contract is documented
- [ ] Output artifact contract specifies folder structure
- [ ] Credits edge cases matrix is complete

### Feature Overlap Analysis (NEW)
- [ ] Feature overlap analysis section (Section 19) is present
- [ ] All sidebar features checked for wizard integration (store consumer analysis)
- [ ] Dead-end features identified (UI exists but data flow to generation is broken)
- [ ] Code deduplication targets listed with file locations
- [ ] Consolidation recommendations prioritized (P0/P1/P2)

### Testing & Privacy
- [ ] Test metadata includes: last CI commit, last run timestamp, flaky list
- [ ] Minimal education safety/privacy rules are included

---

## What NOT to Include (Avoid Bloat)

To keep the snapshot lightweight and actionable, avoid:
- Huge copied logs (use snippets only)
- Full curriculum pack dumps
- Long code blocks beyond example payloads
- Token-level cost breakdown tables (keep it "credits")
- Implementation details that belong in code comments
- Speculative features not yet planned
- Feature overlap false positives: Multiple entry points to the same wizard (e.g., CreationPanel, "Start Lesson", "Regenerate") are legitimate and should NOT be flagged as overlap. Only flag features where duplicated UI collects the same data type but one path is disconnected from the generation flow.

---

## Notes

- This skill should be invoked periodically (before releases, after major changes)
- The document is designed to be shareable with external AI reviewers
- Evidence-based: only mark features as ✅ Verified if proven by artifact + logs + test
- Do NOT include sensitive values (API keys, passwords)
- All sections must be present even if marked 🔴 Missing
- **Persistence of Intent**: The snapshot must always capture HOW high-quality outputs are produced (deterministic pipeline) and WHY credits are protected (fairness contract)
- **Traceability**: The PRD table helps track what's implemented vs planned to prevent drift

---

## Copy/Paste Snippets (For Consistent Output)

### Premium Secret Ownership Model Snippet
```md
## Premium Secret Ownership Model (Production Decision)
**Current Mode:** Hybrid
**Target Mode:** Hybrid

- **Local (Free):** Ollama runs fully on teacher machine.
- **Premium (Paid):** Requests go to TA-hosted Generation API.
- **Teacher machine stores no OpenAI/Stripe secrets.**
- Premium API URL (prod): https://api.ta.app (example)
- Healthcheck: GET /health
- If API down: show "Premium services are temporarily unavailable. Local mode still works."
```

### Release Readiness Snippet
```md
## Release Readiness
**Status:** ⚠️ Buildable
**Evidence:** Installer builds via `tauri build` but not verified on clean machine.

- Last clean-machine install test: (missing)
- Artifact: TA_0.1.0_x64_en-US.msi
- No-terminal install: (unverified)
```
