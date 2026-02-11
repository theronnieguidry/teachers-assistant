# Release Notes

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
