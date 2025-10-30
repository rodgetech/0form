# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 AI chatbot application built with the AI SDK, featuring real-time streaming chat, document editing with AI-powered suggestions, and multi-modal capabilities. It uses xAI's Grok models via Vercel AI Gateway by default.

## Development Commands

```bash
# Development
pnpm dev              # Start dev server with Turbo (localhost:3000)

# Building
pnpm build            # Run migrations + build for production

# Code Quality
pnpm lint             # Check code with Ultracite (Biome-based)
pnpm format           # Auto-fix issues with Ultracite

# Database (Drizzle ORM + Postgres)
pnpm db:generate      # Generate migration files from schema
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Drizzle Studio UI
pnpm db:push          # Push schema changes directly
pnpm db:pull          # Pull schema from database
pnpm db:check         # Check migrations
pnpm db:up            # Apply migrations

# Testing
pnpm test             # Run Playwright tests
```

## Architecture

### Core Technologies
- **Next.js 15**: App Router with React Server Components and Server Actions
- **AI SDK (5.x)**: Unified interface for LLM interactions with streaming support
- **Vercel AI Gateway**: Routes AI model requests through unified gateway (OIDC auth on Vercel, API key for local)
- **Drizzle ORM + Postgres**: Type-safe database operations with Neon Serverless Postgres
- **Auth.js (NextAuth v5)**: Authentication with email/password and guest mode
- **TokenLens**: Token usage tracking and cost estimation
- **Ultracite**: Zero-config Biome-based linter/formatter with strict rules

### Project Structure

```
app/
  (auth)/           # Authentication routes and logic
    auth.ts         # NextAuth configuration
    auth.config.ts  # Auth provider configuration
    api/auth/       # Auth API routes
  (chat)/           # Main chat application
    api/
      chat/         # Chat streaming endpoint
      document/     # Document CRUD operations
      suggestions/  # AI-powered text suggestions
      vote/         # Message voting
      history/      # Chat history
    page.tsx        # Chat home page
    chat/[id]/      # Individual chat pages
lib/
  ai/
    models.ts       # Model definitions (Grok Vision, Grok Reasoning)
    providers.ts    # AI provider configuration (gateway or mock for tests)
    prompts.ts      # System prompts and request hints
    entitlements.ts # User type limits (messages per day)
    tools/          # AI tools (create/update documents, weather, suggestions)
  db/
    schema.ts       # Drizzle schema (User, Chat, Message_v2, Document, etc.)
    queries.ts      # Database query functions
    migrate.ts      # Migration runner
    migrations/     # Generated SQL migrations
  editor/           # Rich text editor utilities (ProseMirror, diff logic)
  artifacts/        # Document artifact handling
  usage.ts          # Token usage tracking types
  errors.ts         # ChatSDKError class with structured error codes
  utils.ts          # Shared utilities
components/
  elements/         # Low-level UI components (message, reasoning, tool, etc.)
  ui/               # shadcn/ui components (Radix + Tailwind)
  chat.tsx          # Main chat interface
  artifact.tsx      # Document artifact viewer/editor
  multimodal-input.tsx  # Chat input with file upload
  app-sidebar.tsx   # Navigation sidebar
```

### Key Patterns

#### AI Model Configuration
- Models are defined in `lib/ai/models.ts` with IDs that map to providers in `lib/ai/providers.ts`
- Production uses Vercel AI Gateway with xAI models (grok-2-vision-1212, grok-3-mini)
- Test environment uses mock models from `lib/ai/models.mock.ts`
- Reasoning model uses `extractReasoningMiddleware` to process `<think>` tags

#### Database Schema
- Uses versioned tables (`Message_v2`, `Vote_v2`) - old tables are deprecated but kept for migration
- Messages use `parts` array for content (supports text, image, tool calls)
- Documents have composite primary key: `(id, createdAt)`
- Suggestions link to documents with foreign key to `(documentId, documentCreatedAt)`

#### Chat Streaming Flow
1. User message saved to DB immediately
2. `createUIMessageStream` orchestrates the stream
3. `streamText` generates AI response with tools
4. `smoothStream` chunks by word for better UX
5. `onFinish` saves messages and usage data (via TokenLens)
6. Response sent as SSE via `JsonToSseTransformStream`

#### Authentication & Authorization
- Session-based auth via Auth.js with database adapter
- User types: `registered` (email/password), `guest` (anonymous), `admin`
- Rate limits enforced via `entitlementsByUserType` (messages per 24h)
- Guest sessions have lower limits

#### Document Artifacts
- AI can create/update documents via tools
- Types: text, code, image, sheet
- Text editor: ProseMirror-based with markdown support
- Code editor: CodeMirror with syntax highlighting
- Suggestions: AI-powered text improvements with diff view

#### Error Handling
- Centralized via `ChatSDKError` class in `lib/errors.ts`
- Error codes follow pattern: `{category}:{context}` (e.g., "unauthorized:chat")
- Special handling for AI Gateway credit card errors

#### Resumable Streams
- Uses `resumable-stream` library with Redis for stream persistence
- Allows chat continuation after disconnect
- Currently commented out in route handler but infrastructure present

### Environment Variables

Required variables (see `.env.example`):
- `AUTH_SECRET`: Session encryption key
- `AI_GATEWAY_API_KEY`: For non-Vercel deployments (Vercel uses OIDC)
- `POSTGRES_URL`: Database connection string
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage for file uploads
- `REDIS_URL`: Optional, for resumable streams

### Code Style (Ultracite/Biome)

Key enforced rules:
- Use `for-of` instead of `Array.forEach`
- Use arrow functions over function expressions
- Use `const` for single-assignment variables
- Use template literals for string concatenation
- Don't use `any`, TypeScript enums, namespaces, or non-null assertions
- Use `import type` and `export type` for types
- No console.log in production code
- Strict accessibility rules for JSX

### Testing

- Playwright tests in `*.test.ts` files
- Set `PLAYWRIGHT=True` env var when running tests
- Tests use mock models from `lib/ai/models.mock.ts`

### Migration Notes

- Message schema migrated from single `content` field to `parts` array (see deprecation comments)
- If working with legacy data, check `lib/db/helpers/01-core-to-parts.ts` for migration logic
- Migration guide: https://chat-sdk.dev/docs/migration-guides/message-parts

### Common Gotchas

1. **Model IDs**: Use string IDs from `lib/ai/models.ts`, not direct provider model names
2. **Server-Only Code**: Database queries are marked `"server-only"` - import only in Server Components/Actions
3. **Message Parts**: Messages use `parts` array (not `content`) - handle text, image, and tool-call parts
4. **Build Process**: Migrations run automatically during `pnpm build` via `lib/db/migrate.ts`
5. **Turbo Mode**: Dev server uses `--turbo` flag for faster HMR
