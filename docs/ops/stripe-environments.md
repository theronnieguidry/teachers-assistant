# Stripe Environment Separation Runbook

## Goal

Keep staging and production billing isolated so test-mode Stripe objects are never used in production purchases.

## Required Environment Variables

| Variable | Staging | Production |
|---|---|---|
| `STRIPE_MODE` | `test` | `live` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | test webhook secret | live webhook secret |
| `APP_URL` | staging desktop/web URL | production desktop/web URL |

## Credit Pack Price IDs

Use environment-specific price IDs in `credit_packs.stripe_price_id`:

- Staging rows must reference Stripe **test** price IDs.
- Production rows must reference Stripe **live** price IDs.
- Placeholder values (for example `price_*_placeholder`) must not be used in deployed environments.

## Webhook Endpoint Setup

Create one webhook endpoint per environment in Stripe Dashboard:

- Staging endpoint URL: `https://<staging-api-host>/checkout/webhook`
- Production endpoint URL: `https://<production-api-host>/checkout/webhook`

Recommended events:

- `checkout.session.completed`
- `checkout.session.expired`

## API Safeguards

`POST /checkout/create-session` now returns explicit codes for easier diagnosis:

- `stripe_not_configured`: missing Stripe secret key
- `stripe_mode_mismatch`: `STRIPE_MODE` and key prefix do not match
- `stripe_pack_not_configured`: pack has placeholder/missing price ID
- `stripe_runtime_error`: Stripe API temporarily unavailable

These are safe for teacher-facing UX and help differentiate configuration issues from transient runtime failures.
