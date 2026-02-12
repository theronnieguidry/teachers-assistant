# Release Notes

## v0.1.0 - 2026-02-12

### Release Highlights
- Hosted Generation API deployment pipeline to Cloud Run for staging/production with smoke validation (`#31`).
- Runtime endpoint switching + hosted-premium safety hardening for teacher machines (`#32`, `#39`).
- Stripe environment separation and checkout hardening for misconfiguration diagnostics (`#43`, `#50`).
- Wizard UX polish for Step 1 and Lesson Plan options density/readability (`#48`, `#49`).
- Learning Path bridge completion:
  - objective metadata persistence (`#35`)
  - objective deep-linking from library (`#37`)
  - objective launch presets (`#38`)
  - one-off flow in Learning Path (`#47`)
- Design-pack generation integration + local-first inspiration/storage ADR completion (`#33`, `#34`).
- Premium QA transparency and ledger/bulk project tools (`#44`, `#45`, `#46`).
- Dependency hygiene for deprecated punycode chain in Generation API (`#29`).

### Release Operations
- Release workflow hardening with explicit preflight checks for signing secrets and release docs.
- New runbooks/checklists:
  - `docs/ops/cloud-run-deploy.md`
  - `docs/ops/release-checklist.md`
  - `docs/qa/clean-machine.md`

## 2026-02-11 - Backend-Managed Free Local Model Rollout

### Highlights
- Added backend-managed local model policy for Ollama free generation.
- Default local model locked to `llama3.1:8b` with fallback chain:
  1. `qwen2.5:7b`
  2. `gemma3:4b`
  3. `llama3.2`
- Added startup warmup/readiness checks and health visibility fields.
- Removed user-facing local model/setup controls from the app UI.
- Hardened frontend-to-tauri surface by removing Ollama control invokes from user-facing paths.

### Behavioral Changes
- Local/free generation now ignores client-provided `aiModel` values.
- Prompt polishing for local provider uses the backend-resolved local model path.
- Wizard local provider flow no longer requires a model dropdown selection.

### Breaking/Compatibility Notes
- Frontend no longer exposes Local AI setup modal or model picker controls.
- Tauri invoke surface no longer exposes user-triggerable Ollama control commands (`install/start/stop/pull/list/recommend`).
- `/health` now includes:
  - `ollamaReachable`
  - `localModelReady`
  - `activeLocalModel`
  - `warmingUp`
