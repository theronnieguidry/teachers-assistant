# Release Checklist (v0.1.0+)

Use this checklist before creating any `v*` tag that triggers `.github/workflows/release.yml`.

## Prerequisites

- [ ] `master` is clean and synced to `origin/master`.
- [ ] Wave-level quality gates passed:
  - `npm run test:run`
  - `cd generation-api && npm run test:run`
  - `npx playwright test --project=chromium`
- [ ] Cloud Run deployment workflow is green for staging (`.github/workflows/deploy-api.yml`).
- [ ] Stripe environment separation validated (`docs/ops/stripe-environments.md`).
- [ ] Clean-machine validation checklist completed (`docs/qa/clean-machine.md`).

## Required GitHub Secrets

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

## Release Notes

- [ ] `RELEASE_NOTES.md` updated with new release section and notable changes.
- [ ] Version heading exists for the tag being cut (example: `## v0.1.0 - 2026-02-12`).

## Tag + Publish Steps

```bash
git checkout master
git pull --ff-only
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

- [ ] Confirm GitHub Actions `Release` workflow started from tag push.
- [ ] Confirm release page exists and includes installer assets and updater metadata.

## Installer Smoke Evidence Template

- Tag:
- Release URL:
- Installer asset name:
- Machine/VM:
- Result:
  - [ ] Installer launches app
  - [ ] Login works
  - [ ] Generation flow opens
  - [ ] Update metadata detected by app
- Notes:
