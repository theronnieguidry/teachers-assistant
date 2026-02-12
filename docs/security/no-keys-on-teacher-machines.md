# No Keys on Teacher Machines

## Policy

Teacher-facing desktop distributions must not ship with provider, billing, or backend service-role secrets.

## Enforcement

1. Premium AI is enabled only when the runtime Generation API endpoint resolves to a hosted HTTPS URL.
2. Local/unhosted endpoints disable Premium by default in the wizard.
3. A `Developer override for Premium` toggle exists for local development only.
4. CI/release pipelines run `npm run scan:artifact-secrets` to detect leaked key patterns in built artifacts.

## Required Secrets Location

All of the following must stay server-side only:

- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PIXABAY_API_KEY`

## Operational Note

For production installs, point desktop clients at the hosted Generation API endpoint via runtime settings (Staging/Production preset or a managed custom HTTPS URL).
