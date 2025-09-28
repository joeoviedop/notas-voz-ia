# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **monorepo** for an AI-powered voice notes application that converts audio files into transcriptions, summaries, and actionable items. The system integrates with multiple AI providers (OpenAI, AssemblyAI, Anthropic) and provides both real and mock modes for development.

**✅ API Contracts Status**: Complete OpenAPI v1.0.0 specification implemented with all MVP endpoints, Zod schemas, TypeScript SDK, and comprehensive documentation.

## Architecture

### High-Level Structure
- **Frontend**: Next.js 14 App Router (port 3000) with Tailwind CSS and MSW for mocking
- **Backend**: Fastify API server (port 4000) with structured logging and middleware
- **Packages**: Shared schemas (Zod) and auto-generated SDK from OpenAPI
- **Contracts**: OpenAPI 3.0 specification defining the complete API
- **Mocks**: Express mock server (port 5000) with realistic data simulation

### Key Design Patterns
- **Contract-First Development**: API specification drives SDK generation
- **Provider Pattern**: Pluggable AI providers (OpenAI, AssemblyAI, Anthropic) with mock implementations
- **State Machine**: Notes progress through states: `idle → uploading → uploaded → transcribing → summarizing → ready/error`
- **Workspace Dependencies**: Packages use `workspace:*` for internal dependencies

## Development Commands

### Setup & Environment
```bash
# Initial setup
pnpm install && pnpm setup

# Environment configuration
cp .env.example .env
# Set STT_PROVIDER=mock and LLM_PROVIDER=mock for development without API keys
```

### Development Workflow
```bash
# Start all services (frontend + backend + mocks)
pnpm dev

# Or run individually:
pnpm --filter frontend dev     # Next.js at localhost:3000
pnpm --filter backend dev      # Fastify at localhost:4000
pnpm mocks:dev                # Mock server at localhost:5000
```

### Code Quality
```bash
# Lint & format (runs across all packages)
pnpm lint
pnpm format

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Full CI pipeline locally
pnpm ci
```

### OpenAPI & SDK Workflow
```bash
# Validate API specification
pnpm contracts:check

# Regenerate TypeScript SDK after OpenAPI changes
pnpm sdk:generate

# The SDK is auto-generated in packages/sdk and used by frontend
```

### Build & Deployment
```bash
# Build all packages and apps
pnpm build

# Clean all build outputs
pnpm clean
```

## Development Patterns

### Mock-Driven Development
The project supports development without external API keys using comprehensive mocks:
- **Mock Server**: `/mocks/server.js` provides realistic API responses with state transitions
- **MSW Integration**: Frontend uses Mock Service Worker when `NEXT_PUBLIC_MOCK_MODE=true`
- **Test Credentials**: `test@example.com` / `password123` for mock authentication

### OpenAPI-First Approach
1. Define API changes in `contracts/openapi.yaml`
2. Run `pnpm contracts:check` to validate
3. Run `pnpm sdk:generate` to update TypeScript client
4. Frontend automatically gets typed API client

### Package Architecture
- `packages/schemas`: Zod schemas shared between frontend/backend for validation
- `packages/sdk`: Complete TypeScript client with all endpoints and error handling
- Apps import packages using workspace references: `@notas-voz/schemas`, `@notas-voz/sdk`

## ✅ API Contracts (Implemented)

### Complete OpenAPI v1.0.0 Specification
The API contracts are **frozen and ready** for parallel development:

- **Location**: `contracts/openapi.yaml`
- **Base URL**: `/api/v1` (development: `localhost:4000/api/v1`)
- **Validation**: Passes `redocly lint` with minor warnings
- **Documentation**: Complete with examples in `contracts/README.md`

### Implemented Endpoints

#### Authentication (`/api/v1/auth/*`)
- `POST /auth/register` - User registration with email/password
- `POST /auth/login` - Login with credentials, returns access token + cookie
- `POST /auth/refresh` - Renew access token using refresh cookie
- `POST /auth/logout` - Invalidate refresh token and clear cookie
- `POST /auth/reset/request` - Request password reset email
- `POST /auth/reset/confirm` - Confirm password reset with token

#### Notes Management (`/api/v1/notes/*`)
- `GET /notes` - List notes with cursor pagination, search, and filters
- `POST /notes` - Create empty note with title/tags
- `GET /notes/{id}` - Get note details with transcript/summary/actions
- `PATCH /notes/{id}` - Update note metadata
- `DELETE /notes/{id}` - Delete note and associated files
- `POST /notes/{id}/upload` - Upload audio file to existing note

#### Async Processing (`/api/v1/notes/{id}/*`)
- `POST /notes/{id}/transcribe` - Start transcription job (202 response)
- `POST /notes/{id}/summarize` - Start summarization job (202 response)

#### Actions Management (`/api/v1/actions/*`)
- `POST /notes/{id}/actions` - Add action item to note
- `PATCH /actions/{id}` - Update action text/status/due date
- `DELETE /actions/{id}` - Remove action item

### Error Handling (Implemented)
**10 Typed Error Codes** with consistent format:
```typescript
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```

**Error Codes**: `AUTH_INVALID_CREDENTIALS`, `AUTH_TOKEN_EXPIRED`, `FILE_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`, `NOTE_NOT_FOUND`, `LLM_FAILURE`, `STT_FAILURE`, `RATE_LIMITED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`

### SDK Usage (Ready for Frontend)
```typescript
import { createApiClient, ApiError } from '@notas-voz/sdk';

const client = createApiClient({
  baseUrl: 'http://localhost:4000/api/v1',
  accessToken: 'jwt-token',
  timeout: 30000
});

// Complete typed API access
const notes = await client.listNotes({ query: 'meeting' });
const note = await client.createNote({ title: 'My Note', tags: ['work'] });
await client.uploadAudioToNote(note.id, audioFile);
```

## Environment Configuration

### Key Environment Variables
```bash
# Required for real AI processing
OPENAI_API_KEY=sk-your-key
STT_PROVIDER=openai  # or 'mock' or 'assemblyai'
LLM_PROVIDER=openai  # or 'mock' or 'anthropic'

# Development (no API keys needed)
STT_PROVIDER=mock
LLM_PROVIDER=mock
NEXT_PUBLIC_MOCK_MODE=true

# Backend
PORT=4000
JWT_SECRET=your-secret
DATABASE_URL=postgres://user:pass@localhost:5432/notes

# Storage (S3-compatible)
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_BUCKET=notes-audio
```

### Provider Switching
The system supports multiple AI providers:
- **STT**: OpenAI Whisper, AssemblyAI, or mock
- **LLM**: OpenAI GPT-4o-mini, Anthropic Claude, or mock
- Switch via environment variables without code changes

## File Processing Pipeline

### Audio Upload Flow (Updated with Contract Implementation)
1. **Create Note**: `POST /api/v1/notes` creates empty note with metadata
2. **Upload Audio**: `POST /api/v1/notes/{id}/upload` with multipart audio file
3. **Storage**: File saved to S3-compatible storage, status = `uploaded`
4. **Transcription**: `POST /api/v1/notes/{id}/transcribe` triggers STT provider (202 response)
5. **Summarization**: `POST /api/v1/notes/{id}/summarize` triggers LLM provider (202 response) 
6. **Completion**: Note status becomes `ready` with transcript, summary, bullets, and actions

### State Management
Notes have a strict state progression managed by the backend:
```
idle → uploading → uploaded → transcribing → summarizing → ready
                                    ↓
                                  error
```

## Testing & Quality

### Testing Strategy
- **Unit Tests**: Jest for individual functions and components
- **Type Safety**: Strict TypeScript across all packages
- **Contract Testing**: OpenAPI validation ensures API compliance
- **Mock Integration**: Comprehensive mocks enable testing without external dependencies

### Code Standards
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, etc.
- **ESLint + Prettier**: Consistent code formatting
- **Husky Hooks**: Pre-commit linting and formatting
- **CODEOWNERS**: Enforces team reviews for sensitive areas

### CI/CD Pipeline
GitHub Actions runs:
1. **Lint & Format Check**: ESLint + Prettier validation
2. **Type Check**: TypeScript compilation
3. **Build**: All packages and apps
4. **Tests**: Unit test suite
5. **Contract Validation**: OpenAPI spec and SDK generation
6. **Security Audit**: Dependency vulnerability scan

## Project-Specific Notes

### Monorepo Coordination
- Uses pnpm workspaces with `pnpm-workspace.yaml`
- Shared dependencies managed at root level
- Package scripts use `pnpm -r` for parallel execution across workspaces

### Authentication Flow (Contract Implementation)
- **JWT RS256** with access tokens (15min) and refresh tokens (7d)
- **Access tokens**: Sent via `Authorization: Bearer <token>` header
- **Refresh tokens**: Stored in httpOnly cookies with `SameSite=Lax`
- **Public routes**: All `/api/v1/auth/*` endpoints
- **Protected routes**: Everything else requires valid JWT
- **Mock mode**: Instant auth with `test@example.com` / `password123`

### Error Handling & Observability
- **Structured Logging**: Pino logger with correlation IDs
- **Health Checks**: `/health` endpoint for service monitoring  
- **Error Boundaries**: Proper error handling in React components
- **API Responses**: Consistent structure with correlation IDs and timestamps

### Security Considerations
- **File Upload Limits**: 25MB max file size
- **CORS Configuration**: Strict origins in production
- **Rate Limiting**: Configurable request limits
- **Input Validation**: Zod schemas validate all inputs
- **Helmet**: Security headers in production

## Troubleshooting

### Common Issues
```bash
# Dependency conflicts
rm -rf node_modules && pnpm install

# TypeScript errors after schema changes
pnpm typecheck
# Check packages/schemas for validation errors

# OpenAPI/SDK generation issues
pnpm contracts:check
pnpm sdk:generate
# Validate syntax in contracts/openapi.yaml

# Mock server not working
pnpm mocks:dev
# Check port 5000 availability
```

### Development Setup Issues
- **Node Version**: Requires Node.js >=20.0.0 (enforced by `.nvmrc`)
- **pnpm Version**: Requires pnpm >=8.0.0 (enforced by `packageManager` field)
- **Port Conflicts**: Ensure ports 3000, 4000, 5000 are available
- **Environment Variables**: Copy `.env.example` and set mock providers for local development

This monorepo structure enables multiple developers to work in parallel on different features while maintaining consistency through shared schemas, comprehensive mocking, and contract-driven development.