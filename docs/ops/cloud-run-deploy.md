# Cloud Run Deployment Runbook (Generation API)

## Goal

Deploy `generation-api` to hosted HTTPS endpoints for `staging` and `production` with repeatable workflow automation and smoke verification.

## Workflow

- Workflow file: `.github/workflows/deploy-api.yml`
- Trigger modes:
  - Push to `master`: deploys `staging`.
  - Push tag `v*`: deploys `production`.
  - Manual dispatch: deploy `staging`, `production`, or `both`.

## Required GitHub Environment Setup

Create two GitHub environments:

- `staging`
- `production`

Add these secrets in each environment:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `CLOUD_RUN_SERVICE`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MODE`
- `APP_URL`
- `PIXABAY_API_KEY`
- `SMOKE_TEST_AUTH_TOKEN` (valid Supabase auth token for `/estimate` smoke)

## Container Image

- Dockerfile: `generation-api/Dockerfile`
- Base image: Playwright runtime image (Chromium included), so PDF/inspiration parsing paths work in Cloud Run.
- Runtime defaults for Cloud Run:
  - `NODE_ENV=production`
  - `PORT=8080`
  - `OLLAMA_AUTO_PULL=false`
  - `OLLAMA_WARMUP_TIMEOUT_MS=5000`

## Deployment Validation

The workflow deploy job runs:

1. `scripts/smoke-api.cjs` against deployed URL:
   - `GET /health`
   - Authenticated `POST /estimate`
2. Staging-only Playwright smoke:
   - `e2e/staging-api-smoke.spec.ts`
   - Guarded by staging URL/token env vars set in workflow.

## Manual Smoke Commands

```bash
# Scripted smoke
API_BASE_URL="https://<cloud-run-url>" \
API_BEARER_TOKEN="<supabase-jwt>" \
node scripts/smoke-api.cjs
```

```bash
# Playwright smoke (API only, no local web server)
PLAYWRIGHT_SKIP_WEBSERVER=1 \
STAGING_API_URL="https://<cloud-run-url>" \
STAGING_API_TOKEN="<supabase-jwt>" \
npx playwright test e2e/staging-api-smoke.spec.ts --project=chromium
```

## Desktop Runtime Endpoint Selection

Desktop endpoint switching is runtime-configurable and does not require rebuilds:

- Settings dialog endpoint presets/custom URL (`#32` implementation).
- Verify endpoint choice in diagnostics before premium generation checks.

## Rollback

If a deploy fails smoke checks or production quality gates:

1. Open Cloud Run revision history for the service.
2. Route traffic back to prior healthy revision.
3. Re-run smoke checks against restored revision URL.
4. Leave issue/PR note with failed revision SHA and rollback timestamp.
