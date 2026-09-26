# Fable

A Fathom-inspired AI meeting intelligence prototype built for the 8x Assignment. Fable focuses on the post-meeting workflow: understanding a conversation, reviewing synchronized notes, tracking decisions and action items, and asking contextual questions about a meeting.

## Features

- Dashboard with 12 realistic seeded meetings
- Detailed meeting summaries, topics, decisions, and sentiment
- Speaker-attributed transcripts with search
- Simulated playback with transcript and highlight synchronization
- Action-item filtering and completion tracking
- Timestamped meeting highlights
- Gemini-powered, meeting-grounded AI chat through the backend
- Responsive desktop-oriented application shell

The recording layer is intentionally simulated. The meeting data, action-item changes, and AI requests use the backend; the Gemini key remains server-side.

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- Lucide React
- date-fns
- FastAPI
- SQLAlchemy
- Supabase PostgreSQL
- Gemini API

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- Python 3.11 or newer
- A Supabase PostgreSQL connection string
- A Gemini API key for meeting Q&A

### Installation

```bash
git clone https://github.com/mukulpythondev/fanthom.git
cd fanthom
cd frontend
npm install
npm run dev
```

Vite will print the local development URL, normally `http://localhost:5173`.

Create `backend/.env` or export these variables before starting the backend. Never put the Gemini key in frontend environment variables.

```env
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
GEMINI_API_KEY=<server-side-key>
FRONTEND_ORIGIN=http://localhost:5173
```

Start the API from the repository root with:

```bash
python backend/run.py
```

The frontend proxies `/api` requests to `http://localhost:8001`. Seed the configured database with the 12 reference meetings using:

```bash
python backend/app/seed.py
```

### Render Backend

Create a Render Web Service with `backend` as its root directory. Use these settings:

```text
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: python run.py
```

Set `DATABASE_URL`, `GEMINI_API_KEY`, and `FRONTEND_ORIGIN` in the Render environment. Render supplies `PORT` automatically; `backend/run.py` uses it and runs without the development reload process.

## Available Scripts

```bash
cd frontend
npm run dev       # Start the development server
npm run build     # Type-check and create a production build
npm run preview   # Preview the production build locally
npm run lint      # Lint application source
```

## Project Structure

```text
frontend/
  src/
    components/   Reusable meeting and navigation components
    context/      Frontend view state and API-backed actions
    data/         Seed/reference meeting data for backend seeding
    pages/        Dashboard, meeting detail, and search views
    services/     Typed API clients for meetings and Gemini Q&A
    types/        Shared TypeScript models
backend/
  app/main.py     FastAPI application and API contract
  app/database.py SQLAlchemy models and Supabase connection
  app/seed.py     Reference data seeder
docs/             Product specification
images/           User-captured product research references
.agent-logs/      Preserved coding-agent capture logs
.claude/          Automatic capture hook configuration
```

## Product Research

The `images/` directory contains screenshots captured while studying the reference platform's information architecture and interaction patterns. They are retained as assignment research material and are not screenshots or runtime assets of this implementation.

## Demo Flow

For the most complete walkthrough, open **Q4 Product Strategy Review**. It is a 58-minute meeting with eight participants and demonstrates:

1. Structured AI summary, topics, and decisions
2. Simulated playback and timestamped highlights
3. Searchable transcript with click-to-seek behavior
4. Action-item completion
5. Contextual questions such as `What decisions were made?`

## Architecture and Scope

The runtime path is:

```text
React/Vite frontend
  -> FastAPI backend
  -> Supabase PostgreSQL
  -> Gemini API (meeting Q&A only)
```

The repository prioritizes the assignment's core meeting experience. Authentication, real media capture, URL routing, sharing, templates, and calendar integrations are intentionally outside the current revision. Action-item completion is persisted through the API and database.

See [docs/product-spec.md](docs/product-spec.md) for the original product brief and [IMPLEMENTATION-AUDIT.md](IMPLEMENTATION-AUDIT.md) for the implementation audit.

## Agent Capture

Claude Code hooks preserve submitted prompts and final responses in `.agent-logs/`. The mechanism and known canary limitations are documented in [CAPTURE-TEST.md](CAPTURE-TEST.md).

## Contributing

Issues and focused pull requests are welcome. Before submitting a change:

1. Keep changes scoped to the reported behavior.
2. Run `npm run build`.
3. Run `npx oxlint src`.
4. Include screenshots for visible UI changes.

## Acknowledgements

This is an independent educational prototype inspired by Fathom's meeting-intelligence workflows. It is not affiliated with or endorsed by Fathom.
