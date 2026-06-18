# Wetransferish — Master Implementation Plan

> **For agentic workers:** Execute phases in order. Each phase is a self-contained plan file.

**Goal:** Build a WeTransfer MVP clone demonstrating streaming efficiency in Node.js, hexagonal architecture, clean architecture React, and parse-don't-validate throughout.

## Phases

| # | File | Description | Depends on |
|---|------|-------------|------------|
| 1 | [phase-1-foundation.md](./phase-1-foundation.md) | Monorepo setup, shared Result type, API DTOs | — |
| 2 | [phase-2-backend-domain.md](./phase-2-backend-domain.md) | Value objects, entities, aggregate, port interfaces | Phase 1 |
| 3 | [phase-3-backend-application.md](./phase-3-backend-application.md) | Use cases, in-memory fakes, application errors | Phase 2 |
| 4 | [phase-4-backend-infrastructure.md](./phase-4-backend-infrastructure.md) | Fastify routes, Postgres adapter, MinIO adapter, DI container | Phase 3 |
| 5 | [phase-5-frontend.md](./phase-5-frontend.md) | React 19 + React Compiler, clean architecture, UI components | Phase 1 |
| 6 | [phase-6-docker.md](./phase-6-docker.md) | Dockerfiles, nginx, docker-compose, smoke test | Phase 4, 5 |

## Global Constraints (apply to all phases)

- Node.js 22 LTS (pinned via Volta)
- pnpm 10 workspaces
- TypeScript 5.9, strict mode everywhere
- Vitest for all tests
- TDD: Red → Green → Refactor, inside-out
- Parse don't validate: Result<T, E> everywhere, no thrown exceptions for domain logic
- No primitive types in domain signatures — use value objects
- Commit after each task
