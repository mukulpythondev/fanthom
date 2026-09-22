# Fable

A Fathom-inspired AI meeting intelligence prototype built for the 8x Assignment. Fable focuses on the post-meeting workflow: understanding a conversation, reviewing synchronized notes, tracking decisions and action items, and asking contextual questions about a meeting.

## Features

- Dashboard with 12 realistic seeded meetings
- Detailed meeting summaries, topics, decisions, and sentiment
- Speaker-attributed transcripts with search
- Simulated playback with transcript and highlight synchronization
- Action-item filtering and completion tracking
- Timestamped meeting highlights
- Deterministic, meeting-grounded AI chat
- Responsive desktop-oriented application shell

The recording layer and AI provider are intentionally simulated. This keeps the prototype focused on the core post-meeting product experience.

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- Lucide React
- date-fns

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm

### Installation

```bash
git clone https://github.com/mukulpythondev/fanthom.git
cd fanthom
npm install
npm run dev
```

Vite will print the local development URL, normally `http://localhost:5173`.

No environment variables or external services are required.

## Available Scripts

```bash
npm run dev       # Start the development server
npm run build     # Type-check and create a production build
npm run preview   # Preview the production build locally
npx oxlint src    # Lint application source
```

## Project Structure

```text
src/
  components/     Reusable meeting and navigation components
  context/        In-memory application state and actions
  data/           Seeded meeting data
  pages/          Dashboard, meeting detail, and search views
  services/       Deterministic meeting AI service
  types/          Shared TypeScript models
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

## Prototype Scope

This repository prioritizes the assignment's core meeting experience. It does not include production authentication, a backend, persistence, real media capture, URL routing, sharing, templates, or calendar integrations. In-memory changes reset when the page reloads.

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
