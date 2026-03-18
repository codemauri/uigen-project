# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**UIGen** — AI-powered React component generator with live preview. Users describe components in a chat interface; Claude generates code into a virtual filesystem with a sandboxed iframe preview.

## Commands

```bash
npm run setup        # First-time setup: install + prisma generate + migrate
npm run dev          # Dev server with Turbopack (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest (all tests)
npm run db:reset     # Reset SQLite database (destructive)
```

**Run a single test file:**
```bash
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx
```

**Environment:** Set `ANTHROPIC_API_KEY` in `.env`. Without it, a `MockLanguageModel` returns static example code.

## Architecture

### Data Flow

1. **Chat → AI → Virtual Filesystem → Preview**
   - User input → `/api/chat` (streaming) → Claude uses 2 tools → virtual FS updated → JSX transformed → iframe re-renders
   - `ChatContext` holds message history; `FileSystemContext` holds virtual file state

2. **AI Tools** (`src/lib/tools/`)
   - `str_replace_editor` — create/edit files (string replacement)
   - `file_manager` — create/delete directories
   - Max 10,000 tokens, 40 steps (real) / 4 steps (mock)

3. **Virtual Filesystem** (`src/lib/file-system.ts`)
   - In-memory Map tree, no disk I/O
   - Serialized as JSON and stored in `Project.data` (SQLite)

4. **JSX Transform** (`src/lib/transform/jsx-transformer.ts`)
   - Babel standalone: JSX → ES5
   - Import map: `react`/`react-dom` → esm.sh CDN; user files → blob URLs
   - CSS imports extracted and injected separately

5. **Preview** (`src/components/preview/PreviewFrame.tsx`)
   - Sandboxed iframe (`allow-scripts allow-same-origin allow-forms`)
   - Blob URLs for transformed modules

### Authentication

- bcrypt password hashing, JWT sessions via `jose` in HTTP-only cookies (`auth-token`, 7-day expiry)
- Middleware (`src/middleware.ts`) verifies JWT on each request
- Anonymous users work in-memory; authenticated users persist to SQLite via Prisma

### Provider Abstraction (`src/lib/provider.ts`)

- Real: `@ai-sdk/anthropic` when `ANTHROPIC_API_KEY` is present
- Mock: `MockLanguageModel` for local dev without an API key

### Database (Prisma + SQLite)

Two models: `User` (email/password) and `Project` (userId optional, `messages` JSON, `data` JSON for virtual FS). Anonymous projects have null userId. The schema is defined in `prisma/schema.prisma` — reference it anytime you need to understand the structure of data stored in the database.

## Key Conventions

- **Path alias:** `@/*` → `src/*`
- **State:** Chat history and file system state live in React contexts (`src/lib/contexts/`), not component state
- **Server actions:** Auth and project CRUD in `src/actions/`; streaming AI in `src/app/api/chat/route.ts`
- **UI components:** Shadcn/ui (style: new-york) in `src/components/ui/`; configured via `components.json`
- **Tests:** Co-located in `__tests__/` subdirectories; jsdom environment via `vitest.config.mts`
- **Comments:** Use sparingly — only comment complex, non-obvious logic
