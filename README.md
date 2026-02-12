# Teacher's Assistant

AI-powered teaching materials generator for K-3 educators. Create worksheets, lesson plans, and answer keys in minutes.

## Features

- **AI-Powered Generation**: Premium cloud generation plus free local generation
- **Multiple Output Formats**: Worksheets, lesson plans, and answer keys
- **Print-Ready**: PDF export with professional formatting
- **Inspiration Support**: Upload PDFs, images, or URLs to guide content generation
- **Desktop App**: Native Tauri v2 application for Windows (macOS/Linux coming soon)

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Desktop**: Tauri v2 (Rust)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **Generation API**: Node.js + Express
- **AI**: OpenAI API / Ollama (local, backend-managed)

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- Supabase account (or local Supabase)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase and API keys

# Run development server
npm run dev

# Run Tauri desktop app
npm run tauri dev
```

### Local AI (Free) Policy

Local generation is now backend-managed:

- The backend enforces the local Ollama model policy and ignores client `aiModel` overrides for local requests.
- Default local model is `llama3.1:8b` with fallback chain: `qwen2.5:7b`, `gemma3:4b`, `llama3.2`.
- Startup warmup checks Ollama reachability and pulls the selected model automatically when configured.
- User-facing Ollama setup and model picker controls are removed from the app UI.

Health endpoint (`generation-api`) includes local readiness fields:

- `ollamaReachable`
- `localModelReady`
- `activeLocalModel`
- `warmingUp`

### Premium Safety Policy

- Teacher-facing desktop builds must not contain provider or billing secrets.
- Premium mode is only enabled when the app targets a hosted HTTPS Generation API endpoint.
- Local/unhosted endpoints keep Premium disabled by default.
- A local dev override exists in runtime settings for development only and should remain disabled for teacher distributions.
- CI and release workflows run `npm run scan:artifact-secrets` against built artifacts to catch leaked key patterns before shipping.
- Detailed policy/runbook: `docs/security/no-keys-on-teacher-machines.md`.
- Stripe staging/live setup runbook: `docs/ops/stripe-environments.md`.
- Clean-machine QA checklist: `docs/qa/clean-machine.md`.
- Inspiration/design-pack storage ADR: `docs/architecture/adr-0001-local-first-inspiration.md`.

### Testing

```bash
# Unit tests
npm test

# E2E tests (requires dev server running)
npx playwright test

# All tests with coverage
npm run test:coverage
```

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom hooks
│   ├── stores/             # Zustand stores
│   ├── services/           # API clients
│   └── types/              # TypeScript types
├── src-tauri/              # Tauri Rust backend
├── generation-api/         # Content generation service
├── e2e/                    # Playwright E2E tests
└── supabase/               # Database migrations
```

## Contributing

1. Check existing [issues](../../issues) or create a new one
2. Fork the repository
3. Create a feature branch
4. Make changes with tests
5. Submit a pull request

## Development Workflow

This project uses issue-driven development:

1. **Create an issue** describing the feature/bug/task
2. **Implement** with appropriate unit and E2E tests
3. **Run test suite**: `npm test && npx playwright test`
4. **Create PR** referencing the issue

## License

MIT
