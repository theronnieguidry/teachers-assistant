# Teacher's Assistant

AI-powered teaching materials generator for K-6 educators. Create worksheets, lesson plans, and answer keys in minutes.

## Features

- **AI-Powered Generation**: Premium AI (cloud) and Local AI (Ollama) generation modes
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
- **AI**: OpenAI API (Premium) + Ollama (Local)

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

### Local Dev Auth Setup (Hosted Supabase)

For local testing, keep auth in hosted Supabase and Google Cloud:

```bash
# Frontend env
cp .env.example .env

# API env
cp generation-api/.env.example generation-api/.env
```

Set these values in `/Users/ronnieguidry/code/Teachers-Assistant/.env`:

- `VITE_SUPABASE_URL` (your hosted Supabase URL)
- `VITE_SUPABASE_ANON_KEY` (your Supabase anon key)
- `VITE_GENERATION_API_URL=http://localhost:3001`
- `VITE_OAUTH_REDIRECT_URL=http://localhost:1420`

Set these values in `/Users/ronnieguidry/code/Teachers-Assistant/generation-api/.env`:

- `SUPABASE_URL` (same hosted Supabase URL)
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (if you use premium generation/improvements)

Supabase + Google OAuth configuration:

1. In Supabase dashboard, enable Google provider and paste your Google Client ID/Secret.
2. In Google Cloud OAuth client, add redirect URI:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. In Supabase URL configuration, allow:
   - `http://localhost:1420`
   - `tauri://localhost` (for desktop deep-link flow later)

Then run:

```bash
npm run dev:watch
```

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
