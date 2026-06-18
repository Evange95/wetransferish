# Phase 6: Docker & Deployment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Containerize backend, bundle frontend, wire nginx, and run a smoke test via Docker Compose.

**Architecture:** nginx serves as single entry point. `/api/*` is proxied to the backend. All other requests serve the frontend's static bundle. 4 services: nginx, backend, postgres, minio.

**Tech Stack:** Docker, Docker Compose v2, nginx, Node 22 Alpine

## Global Constraints

- `docker compose` (v2 plugin, not `docker-compose`)
- Multi-stage builds to minimize image size
- No secrets in images — use environment variables
- Commit after each task

---

### Task 1: Backend Dockerfile

**Files:**
- Create: `packages/backend/Dockerfile`
- Create: `packages/backend/.dockerignore`

**Interfaces:**
- Consumes: backend source code
- Produces: production Docker image running the Fastify server

- [ ] **Step 1: Create .dockerignore**

`packages/backend/.dockerignore`:
```
node_modules
dist
*.test.ts
*.integration.test.ts
```

- [ ] **Step 2: Create Dockerfile**

`packages/backend/Dockerfile`:
```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
RUN pnpm install --frozen-lockfile --filter @wetransferish/backend --filter @wetransferish/shared

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/backend/ packages/backend/
RUN cd packages/shared && pnpm build
RUN cd packages/backend && pnpm build

FROM node:22-alpine AS production
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
COPY packages/backend/src/infrastructure/persistence/schema.sql packages/backend/src/infrastructure/persistence/

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "packages/backend/dist/main.js"]
```

- [ ] **Step 3: Verify Dockerfile builds**

```bash
docker build -f packages/backend/Dockerfile -t wetransferish-backend .
```

Expected: builds successfully

- [ ] **Step 4: Commit**

```bash
git add packages/backend/Dockerfile packages/backend/.dockerignore
git commit -m "feat(backend): add production Dockerfile with multi-stage build"
```

---

### Task 2: Frontend Dockerfile

**Files:**
- Create: `packages/frontend/Dockerfile`
- Create: `packages/frontend/.dockerignore`

**Interfaces:**
- Consumes: frontend source code
- Produces: build stage that outputs static files to `/app/packages/frontend/dist`

- [ ] **Step 1: Create .dockerignore**

`packages/frontend/.dockerignore`:
```
node_modules
dist
```

- [ ] **Step 2: Create Dockerfile**

`packages/frontend/Dockerfile`:
```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
RUN pnpm install --frozen-lockfile --filter @wetransferish/frontend --filter @wetransferish/shared

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY tsconfig.base.json ./
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/
RUN cd packages/frontend && pnpm build

FROM scratch AS export
COPY --from=build /app/packages/frontend/dist /dist
```

The frontend Dockerfile is a build-only image. The final `dist/` is copied into the nginx container via docker-compose volume or build context.

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/Dockerfile packages/frontend/.dockerignore
git commit -m "feat(frontend): add multi-stage Dockerfile for static bundle"
```

---

### Task 3: nginx Configuration

**Files:**
- Create: `nginx/nginx.conf`
- Create: `nginx/Dockerfile`

**Interfaces:**
- Consumes: frontend bundle, backend upstream
- Produces: nginx reverse proxy serving frontend statics and proxying `/api/*`

- [ ] **Step 1: Create nginx.conf**

`nginx/nginx.conf`:
```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 2G;
    proxy_read_timeout 600s;
    proxy_send_timeout 600s;

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Create nginx Dockerfile**

`nginx/Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

- [ ] **Step 3: Commit**

```bash
git add nginx/
git commit -m "feat: add nginx config with reverse proxy and SPA fallback"
```

---

### Task 4: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `scripts/init-db.sh`

**Interfaces:**
- Consumes: all Dockerfiles, schema.sql
- Produces: `docker compose up` runs the full stack

- [ ] **Step 1: Create init-db script**

`scripts/init-db.sh`:
```bash
#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    $(cat /docker-entrypoint-initdb.d/schema.sql)
EOSQL
```

- [ ] **Step 2: Create docker-compose.yml**

`docker-compose.yml`:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: wetransferish
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./packages/backend/src/infrastructure/persistence/schema.sql:/docker-entrypoint-initdb.d/schema.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - miniodata:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: packages/backend/Dockerfile
    environment:
      PORT: "3000"
      HOST: "0.0.0.0"
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/wetransferish
      MINIO_ENDPOINT: minio
      MINIO_PORT: "9000"
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET: transfers
      MINIO_USE_SSL: "false"
      TRANSFER_EXPIRY_DAYS: "7"
      TRANSFER_MAX_SIZE_BYTES: "2000000000"
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "3000:3000"

  frontend:
    build:
      context: .
      dockerfile: packages/frontend/Dockerfile
    volumes:
      - frontend_dist:/dist

  nginx:
    build:
      context: ./nginx
    ports:
      - "80:80"
    volumes:
      - frontend_dist:/usr/share/nginx/html:ro
    depends_on:
      - backend
      - frontend

volumes:
  pgdata:
  miniodata:
  frontend_dist:
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml scripts/
git commit -m "feat: add docker-compose with postgres, minio, backend, frontend, nginx"
```

---

### Task 5: Smoke Test

**Files:** none (manual verification)

**Interfaces:**
- Consumes: running Docker Compose stack
- Produces: verified working upload → download flow

- [ ] **Step 1: Build and start all services**

```bash
docker compose up --build -d
```

Expected: all 5 services start, health checks pass

- [ ] **Step 2: Wait for services to be healthy**

```bash
docker compose ps
```

Expected: all services show "Up" or "healthy"

- [ ] **Step 3: Create a transfer**

```bash
curl -s -X POST http://localhost/api/transfers | jq
```

Expected: `{ "transferId": "...", "shareLink": "..." }`

- [ ] **Step 4: Upload a file**

```bash
TRANSFER_ID=$(curl -s -X POST http://localhost/api/transfers | jq -r .transferId)
curl -s -X POST "http://localhost/api/transfers/${TRANSFER_ID}/attachments" \
  -F "file=@README.md" | jq
```

Expected: `{ "attachmentId": "...", "fileName": "...", "fileSize": ... }`

Note: if no README.md exists yet, create a minimal one first:
```bash
echo "# Wetransferish" > README.md
```

- [ ] **Step 5: Finalize and download**

```bash
RESULT=$(curl -s -X POST "http://localhost/api/transfers/${TRANSFER_ID}/finalize")
SHARE_LINK=$(echo $RESULT | jq -r .shareLink)
curl -s "http://localhost/api/transfers/${SHARE_LINK}" | jq
curl -s -o /tmp/download.zip "http://localhost/api/transfers/${SHARE_LINK}/download"
file /tmp/download.zip
```

Expected: info returns JSON, download produces a valid ZIP file

- [ ] **Step 6: Verify frontend loads**

```bash
curl -s http://localhost | head -5
```

Expected: HTML with "Wetransferish"

- [ ] **Step 7: Cleanup**

```bash
docker compose down -v
```

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: smoke test passed — full stack working"
```
