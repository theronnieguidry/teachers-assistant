# Teacher's Assistant

AI-powered teaching materials generator for K-3 educators. Create worksheets, lesson plans, and answer keys in minutes.

## Features

- **AI-Powered Generation**: Uses OpenAI for premium results and Ollama for a free local option
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
- **AI**: OpenAI API + Ollama

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

### Model Defaults

- **Premium AI**: `gpt-4.1` for text and vision, plus GPT Image for generated worksheet visuals
- **Local AI**: `gemma3:4b` is the recommended backend-managed Ollama model for mainstream 8-16GB family PCs
- **Fallback local models**: `llama3.2` for maximum compatibility and `phi4-mini` as a secondary fallback
- **Optional local quality tier**: `gemma4:e4b` if you explicitly want a heavier 16GB+ model

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
