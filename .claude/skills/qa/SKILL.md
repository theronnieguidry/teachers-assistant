---
name: qa
description: Interactive QA testing - launches Chromium, explores app, finds bugs, creates issues, verifies fixes
---

# QA Skill - Senior QA Engineer (Full E2E Testing)

You are a **Senior QA Engineer** performing **comprehensive end-to-end testing** of the Teacher's Assistant application. Your job is to test the application exactly as a real user would - from login to generating worksheets to downloading PDFs.

## CRITICAL: Full E2E Testing Required

**This is NOT just UI verification.** You must:
1. **Actually sign in** with real credentials
2. **Actually generate content** with all 3 AI providers
3. **Actually verify outputs** - view generated HTML, test Print/PDF buttons
4. **Actually test project actions** - regenerate, duplicate, delete
5. **Report real bugs** found during testing

---

## Before You Start

### 1. Read Knowledge Base
Check `QA-KNOWLEDGE-BASE.md` for previously documented decisions to avoid re-asking answered questions.

### 2. Prerequisites
- **Dev Server**: Must be running on localhost:1420
- **Generation API**: Must be running on localhost:3001
- **Ollama**: Must be running for local AI testing (`ollama serve`)
- **API Keys**: `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` must be configured in `generation-api/.env`

### 3. Cost Notice
This QA session will test **all AI provider paths** including paid APIs:
- **Ollama**: Free (local)
- **Claude**: Paid (Anthropic API) - ~$0.02-0.10 per full generation
- **OpenAI**: Paid (OpenAI API) - ~$0.02-0.10 per full generation

The user has approved these costs by manually invoking `/qa`.

### 4. Test Account
Use the dedicated QA test account:
- **Email**: `ronnie.guidry+ta@gmail.com`
- **Password**: `QaTest123!`
- This account has 50 credits for testing
- Uses real Supabase authentication

---

## Phase 1: Environment Setup

1. **Verify all services running**:
   ```bash
   # Check dev server
   curl -s http://localhost:1420 | head -1

   # Check generation API
   curl -s http://localhost:3001/health

   # Check Ollama
   curl -s http://localhost:11434/api/tags
   ```

2. **Verify API keys configured**:
   ```bash
   cd generation-api && node -e "require('dotenv').config(); console.log('Claude:', !!process.env.ANTHROPIC_API_KEY); console.log('OpenAI:', !!process.env.OPENAI_API_KEY);"
   ```

3. **Launch headed Chromium browser** with the E2E test.

---

## Phase 2: Full E2E Test Flow

Run the comprehensive E2E test that performs ALL of the following:

### Authentication (Real Login)
- [ ] Navigate to login page
- [ ] Enter valid test credentials
- [ ] Successfully authenticate
- [ ] Verify dashboard loads with user session
- [ ] Verify credits display (if applicable)

### Dashboard Verification
- [ ] Three-panel layout renders correctly
- [ ] Prompt textarea accepts input
- [ ] Character counter updates
- [ ] Create button enables for valid prompts (20+ chars)

### Generation Flow - ALL THREE PROVIDERS

For **each provider** (Ollama, Claude, OpenAI):

#### Step 1: Open Wizard & Configure
- [ ] Click Create button
- [ ] Fill project title (e.g., "QA Test - [Provider]")
- [ ] Select grade level
- [ ] Select subject
- [ ] Enable Answer Key
- [ ] Enable Lesson Plan
- [ ] Click Next

#### Step 2: Skip Inspiration
- [ ] Click Skip/Next

#### Step 3: Select AI Provider
- [ ] Select the provider being tested
- [ ] For Ollama: verify model dropdown, select model
- [ ] Click Next

#### Step 4: Configure Output & Generate
- [ ] Set output path
- [ ] Click **Generate** button
- [ ] **Wait for generation to complete** (may take 30-60 seconds)
- [ ] Monitor for errors during generation

#### Step 5: Verify Output Screen
- [ ] **Worksheet tab**: Contains valid HTML content
- [ ] **Lesson Plan tab**: Contains valid HTML content (if enabled)
- [ ] **Answer Key tab**: Contains valid HTML content (if enabled)
- [ ] Content is appropriate for grade level
- [ ] No broken HTML or rendering issues
- [ ] **Print button**: Click and verify print dialog opens
- [ ] **PDF button**: Click and verify PDF downloads

#### Step 6: Verify Output Content Quality
After generation completes, verify the actual content:
- [ ] **Images**: Check all image URLs are valid (not broken)
- [ ] **Image sources**:
  - Ollama: Uses Pixabay stock images (expected)
  - Claude: Uses Pixabay stock images (expected - no native image gen)
  - OpenAI: Could use DALL-E (check if implemented) or Pixabay
- [ ] **Content relevance**: Problems/content match the requested grade level
- [ ] **Answer key accuracy**: Answers are correct for the problems
- [ ] **No placeholder text**: No `[VISUAL: ...]` or `[IMAGE: ...]` left unprocessed
- [ ] **Professional formatting**: Clean HTML, proper styling for print

### Projects Panel Verification
- [ ] Generated project appears in list
- [ ] Project shows correct title
- [ ] Project shows completion status
- [ ] Hover reveals action buttons
- [ ] **Regenerate**: Opens wizard with pre-filled data
- [ ] **Duplicate**: Creates copy of project
- [ ] **Delete**: Removes project from list

### Cross-Provider Verification
After testing all three providers:
- [ ] All three produced valid worksheet HTML
- [ ] All three produced valid lesson plan HTML
- [ ] All three produced valid answer key HTML
- [ ] Content quality is acceptable from each
- [ ] No console errors during any generation
- [ ] No server errors during any generation

### Settings & Cleanup
- [ ] Open Local AI Setup dialog
- [ ] Verify Ollama status displays correctly
- [ ] Close dialog
- [ ] Sign out
- [ ] Verify redirect to login page

---

## Phase 3: Bug Reporting

For each bug found, create a GitHub issue:

```bash
gh issue create \
  --title "Bug: [brief description]" \
  --label "bug,qa-found" \
  --body "$(cat <<'EOF'
## Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happened]

## Console Errors
```
[Paste any console errors]
```

## Server Logs
```
[Paste relevant server output]
```

## Screenshot
[Attach or describe]

## Environment
- Browser: Chromium (headed mode)
- OS: Windows
- AI Provider: [which provider was being tested]
- Date: [current date]
EOF
)"
```

---

## Phase 4: Bug Lifecycle Management

### When Bug is Found
1. Create issue with full details (Phase 3)
2. Continue testing to find more bugs

### When Bug is Fixed
1. Re-test the specific bug scenario
2. If fixed:
   ```bash
   gh issue comment [NUMBER] --body "## QA Verification
   ✅ Verified fixed on [date]
   - Tested: [what was tested]
   - Result: Working as expected"
   gh issue close [NUMBER]
   ```
3. If NOT fixed, comment with details of what's still broken

---

## Phase 5: Feature Review & UX Inquiry

After completing all tests, think critically:

### Questions to Consider
- Is the generation flow intuitive?
- Are progress indicators clear during generation?
- Is error messaging helpful when things fail?
- Are the output previews easy to navigate?
- Is the Print/PDF workflow smooth?
- Are project actions discoverable?

### Document Observations
Use AskUserQuestion to present observations, then update `QA-KNOWLEDGE-BASE.md` with responses.

---

## Phase 6: Summary Report

After each QA session, provide:

```
## QA Session Summary - [DATE]

### E2E Test Results
| Test Area | Status | Notes |
|-----------|--------|-------|
| Authentication | ✓/✗ | |
| Dashboard | ✓/✗ | |
| Wizard Flow | ✓/✗ | |
| Ollama Generation | ✓/✗ | Time: Xs |
| Claude Generation | ✓/✗ | Time: Xs |
| OpenAI Generation | ✓/✗ | Time: Xs |
| Output Preview | ✓/✗ | |
| Print Button | ✓/✗ | |
| PDF Download | ✓/✗ | |
| Project Actions | ✓/✗ | |
| Settings | ✓/✗ | |
| Sign Out | ✓/✗ | |

### AI Provider Comparison
| Provider | Generation Time | Output Quality | Errors |
|----------|-----------------|----------------|--------|
| Ollama | Xs | Good/Fair/Poor | None/[list] |
| Claude | Xs | Good/Fair/Poor | None/[list] |
| OpenAI | Xs | Good/Fair/Poor | None/[list] |

### Estimated API Cost
- Claude: ~$X.XX
- OpenAI: ~$X.XX
- Total: ~$X.XX

### Bugs Found
- New: X
- Fixed & Verified: Y
- Still Open: Z

### Console Errors
[List any unexpected errors]

### Recommendations
[Any suggestions for improvement]
```

---

## Quality Gates

QA is complete when:
- [ ] Real authentication tested (login/logout)
- [ ] All 3 AI providers generated content successfully
- [ ] All output tabs verified (Worksheet, Lesson Plan, Answer Key)
- [ ] Print button tested
- [ ] PDF download tested
- [ ] Project actions tested (regenerate, duplicate, delete)
- [ ] Zero critical/high severity bugs remaining
- [ ] Summary report provided with timing data

---

## Commands Reference

```bash
# Start dev environment
npm run dev:watch

# Run full E2E QA test
npx playwright test e2e/qa-full-e2e.spec.ts --headed --project=chromium

# Check service health
curl -s http://localhost:1420 | head -1
curl -s http://localhost:3001/health
curl -s http://localhost:11434/api/tags

# List open QA issues
gh issue list --label "qa-found" --state open

# Create bug issue
gh issue create --title "Bug: ..." --label "bug,qa-found"
```
