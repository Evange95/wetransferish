# Wetransferish

A WeTransfer-inspired file sharing application. Upload files, get a shareable link, recipients download them. No authentication — fully anonymous.

## Quick Start

```bash
docker compose up --build -d
```

Open [http://localhost](http://localhost).

To populate with demo data (3 transfers, 9 files):

```bash
./scripts/seed.sh
```

This prints download links you can open right away.

## Architecture

**Monorepo** (pnpm workspaces) with three packages:

```
packages/
├── shared/     # Result<T, E> type, API DTOs
├── backend/    # Fastify 5, Hexagonal Architecture
└── frontend/   # React 19 + React Compiler, Clean Architecture
```

### Backend — Hexagonal Architecture

The backend follows ports & adapters. Dependencies point inward: infrastructure → application → domain.

- **Domain**: Value objects (`ShareLink`, `Expiry`, `FileSize`, `FileName`, `StorageKey`), `Attachment` entity, `Transfer` aggregate with state machine (`collecting` → `ready`), port interfaces
- **Application**: Use cases (`CreateTransfer`, `UploadAttachment`, `FinalizeTransfer`, `GetTransferInfo`, `DownloadAttachment`, `DownloadTransfer`)
- **Infrastructure**: `PostgresTransferRepository`, `MinioFileStorage`, `NanoIdGenerator`, `ArchiverZipCreator`, Fastify routes

**Parse don't validate** everywhere — value objects have private constructors and static `create()` methods returning `Result<T, E>`. If you hold a `FileSize`, it's guaranteed valid. No exceptions for domain logic.

**Streaming end-to-end** — uploads pipe directly to MinIO without buffering. Downloads stream from MinIO to the response. Multi-file downloads generate ZIP archives on-the-fly via streaming.

### Frontend — Clean Architecture

Same layering as the backend: domain (models, ports) → application (use cases) → infrastructure (HTTP adapter) → UI (React).

- **React 19 + React Compiler** — no manual `useMemo`/`useCallback`/`React.memo`
- **Vite** bundler with production build (~80 KB gzipped)
- Drag-and-drop upload with per-file progress tracking
- Download page with skeleton loading, expiry badge, expired state

### Infrastructure

Four Docker containers orchestrated via Docker Compose:

| Service | Role |
|---------|------|
| **nginx** | Reverse proxy, serves frontend statics, routes `/api/*` to backend |
| **backend** | Fastify API server |
| **postgres** | Transfer metadata (transfers + attachments tables) |
| **minio** | S3-compatible object storage for files |

## Development

### Prerequisites

- Node.js 22 (pinned via [Volta](https://volta.sh))
- pnpm 10
- Docker + Docker Compose v2 (via [Colima](https://github.com/abiosoft/colima) or Docker Desktop)

### Install & Run Tests

```bash
pnpm install

# All tests (backend unit + integration, frontend)
pnpm -r test

# Backend only
cd packages/backend && pnpm test

# Frontend only
cd packages/frontend && pnpm test
```

Integration tests use [Testcontainers](https://testcontainers.com/) — they spin up real Postgres and MinIO containers automatically. Docker must be running.

### Local Dev (without Docker Compose)

```bash
# Terminal 1: backend
cd packages/backend && pnpm dev

# Terminal 2: frontend (proxies /api to localhost:3000)
cd packages/frontend && pnpm dev
```

You'll need Postgres and MinIO running locally, or use Docker Compose for just the infrastructure:

```bash
docker compose up postgres minio -d
```

## API

```
POST   /api/transfers                                          → Create transfer
POST   /api/transfers/:transferId/attachments                  → Upload file (multipart)
POST   /api/transfers/:transferId/finalize                     → Mark as ready
GET    /api/transfers/:shareLink                               → Transfer info
GET    /api/transfers/:shareLink/download                      → Download all (ZIP stream)
GET    /api/transfers/:shareLink/attachments/:id/download      → Download single file
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Domain | Value object invariants, aggregate state machine | Pure unit tests, no mocks |
| Application | Use case orchestration | In-memory fakes for ports |
| Infrastructure | Postgres persistence, MinIO storage | Testcontainers (real containers) |
| E2E | Full upload → finalize → download flow | Fastify `inject()` with in-memory fakes |
| Frontend | Use case logic, component behavior | Vitest + Testing Library |

95 tests total. TDD (red-green-refactor) throughout.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 22 |
| Language | TypeScript 5.9 (strict) |
| Backend framework | Fastify 5 |
| Frontend framework | React 19 + React Compiler |
| Bundler | Vite 6 |
| Database | PostgreSQL 16 |
| Object storage | MinIO |
| Test runner | Vitest |
| Integration testing | Testcontainers |
| Package manager | pnpm 10 |
| Containerization | Docker + Docker Compose |
| Reverse proxy | nginx |
