# Clean Machine Checklist

This runbook validates a teacher-ready install on a fresh Windows machine.

## Scope

- Target machine has no Node/Rust/Supabase CLI prerequisites.
- Tester follows the same flow each run and records pass/fail evidence.
- Covers local generation and premium generation (when hosted API is available).

## Test Metadata

- Date:
- Tester:
- Build/version:
- API endpoint preset (`local` / `staging` / `production` / `custom`):
- Premium hosted endpoint available? (`yes` / `no`):

## Preconditions

- [ ] Fresh Windows user profile (or equivalent clean VM snapshot).
- [ ] No developer tools required for test execution.
- [ ] Installer artifact downloaded from release.
- [ ] Internet access available.
- [ ] Credentials available for signup/login flow.

## Checklist

### 1. Install Application

- [ ] Run installer.
- [ ] App launches successfully from Start Menu/Desktop shortcut.
- [ ] No crash or startup blocker shown.

### 2. Initial Auth Flow

- [ ] Create account (or sign in to existing account).
- [ ] Session persists after app reload.

### 3. Configure Generation Endpoint

- [ ] Open endpoint settings dialog.
- [ ] Verify selected endpoint matches test metadata.
- [ ] Confirm endpoint health path is reachable (no immediate fetch errors).

### 4. Optional Local AI Setup (if local generation is being validated)

- [ ] Install/start Ollama on the machine.
- [ ] Local model warmup completes (or clear status indicates missing local runtime).
- [ ] Local generation option is selectable.

### 5. Generate K-3 Worksheet (Local)

- [ ] Open wizard and create K-3 worksheet request (grade K-3).
- [ ] Complete generation with local provider.
- [ ] Preview renders worksheet content.

### 6. Generate K-3 Worksheet (Premium, hosted endpoint only)

- [ ] Premium option is available only when endpoint is hosted.
- [ ] Credits estimate loads.
- [ ] Generation completes with premium provider.
- [ ] Failure case (if triggered) is teacher-readable and actionable.

### 7. Save Output and Print

- [ ] Save/export generated output to local folder.
- [ ] Open print flow from preview/library.
- [ ] Print dialog opens with expected worksheet content.

## Evidence Template

| Step | Result (Pass/Fail) | Evidence |
|---|---|---|
| Install app |  | Screenshot of app launch |
| Auth flow |  | Screenshot of signed-in header |
| Endpoint config |  | Screenshot of endpoint settings |
| Local generation |  | Screenshot of generated local worksheet |
| Premium generation |  | Screenshot of generated premium worksheet or explicit N/A with reason |
| Save/export |  | File path + screenshot of saved output |
| Print flow |  | Screenshot of print preview/dialog |

## Failure Triage Notes

- Capture exact error text and time.
- Capture endpoint preset and provider used when error occurred.
- Include whether failure is reproducible after one retry.
