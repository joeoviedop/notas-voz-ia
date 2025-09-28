# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **monorepo** for an AI-powered voice notes application that converts audio files into transcriptions, summaries, and actionable items. The system integrates with multiple AI providers (OpenAI, AssemblyAI, Anthropic) and provides both real and mock modes for development.

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
- `packages/sdk`: Auto-generated TypeScript client from OpenAPI spec
- Apps import packages using workspace references: `@notas-voz/schemas`, `@notas-voz/sdk`

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

### Audio Upload Flow
1. **Upload**: `POST /notes` with multipart audio file
2. **Storage**: File saved to S3-compatible storage
3. **Transcription**: `POST /notes/{id}/transcribe` triggers STT provider
4. **Summarization**: `POST /notes/{id}/summarize` triggers LLM provider
5. **Completion**: Note status becomes `ready` with transcript, summary, keyPoints, and actions

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

### Authentication Flow
- JWT-based authentication with refresh tokens
- Mock mode provides instant authentication for development
- Production uses secure JWT secrets and proper token rotation

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