# Phase 1: Foundation & Shared Package

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the monorepo structure and shared package so all other phases can build on it.

**Architecture:** pnpm workspaces monorepo with three packages (shared, backend, frontend). Shared contains the Result type and API DTOs.

**Tech Stack:** TypeScript 5.9, pnpm 10, Volta (Node 22 LTS), Vitest

## Global Constraints

- Node.js 22 LTS (pinned via Volta)
- pnpm 10 workspaces
- TypeScript strict mode everywhere
- Vitest for all tests
- Parse don't validate: Result<T, E>, never throw for domain logic

---

### Task 1: Initialize Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/backend/package.json`
- Create: `packages/backend/tsconfig.json`
- Create: `packages/backend/tsconfig.build.json`
- Create: `packages/frontend/package.json`
- Create: `packages/frontend/tsconfig.json`

**Interfaces:**
- Consumes: nothing
- Produces: workspace structure, `@wetransferish/shared` importable from backend and frontend

- [ ] **Step 1: Pin Node and pnpm with Volta**

```bash
volta pin node@22
volta pin pnpm@10
```

- [ ] **Step 2: Create root package.json**

`package.json`:
```json
{
  "name": "wetransferish",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "test": "pnpm -r test",
    "build": "pnpm -r build"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
.env
*.local
```

- [ ] **Step 6: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@wetransferish/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 7: Create backend package**

`packages/backend/package.json`:
```json
{
  "name": "@wetransferish/backend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "dev": "tsx watch src/main.ts",
    "start": "node dist/main.js",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@wetransferish/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vitest": "^3.2.0",
    "tsx": "^4.21.0"
  }
}
```

`packages/backend/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

`packages/backend/tsconfig.build.json`:
```json
{
  "extends": "./tsconfig.json",
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 8: Create frontend package**

`packages/frontend/package.json`:
```json
{
  "name": "@wetransferish/frontend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@wetransferish/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

`packages/frontend/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "verbatimModuleSyntax": false
  },
  "include": ["src"],
  "references": [{ "path": "../shared" }]
}
```

- [ ] **Step 9: Install and verify**

```bash
pnpm install
```

Expected: lockfile created, no errors.

- [ ] **Step 10: Commit**

```bash
git add .
git commit -m "feat: initialize monorepo with pnpm workspaces"
```

---

### Task 2: Result Type

**Files:**
- Create: `packages/shared/src/result.ts`
- Create: `packages/shared/src/result.test.ts`
- Create: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `Result<T, E>`, `ok<T>(value: T): Result<T, never>`, `err<E>(error: E): Result<never, E>`

- [ ] **Step 1: Write failing tests**

`packages/shared/src/result.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { ok, err, type Result } from './result.js';

describe('Result', () => {
  describe('ok', () => {
    it('wraps a value with ok: true', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('narrows type via discriminant', () => {
      const result: Result<number, string> = ok(42);
      if (result.ok) {
        const value: number = result.value;
        expect(value).toBe(42);
      } else {
        expect.unreachable();
      }
    });
  });

  describe('err', () => {
    it('wraps an error with ok: false', () => {
      const result = err('fail');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('fail');
    });

    it('narrows type via discriminant', () => {
      const result: Result<number, string> = err('fail');
      if (!result.ok) {
        const error: string = result.error;
        expect(error).toBe('fail');
      } else {
        expect.unreachable();
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/shared && pnpm test
```

Expected: FAIL — cannot resolve `./result.js`

- [ ] **Step 3: Write implementation**

`packages/shared/src/result.ts`:
```typescript
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

`packages/shared/src/index.ts`:
```typescript
export { type Result, type Ok, type Err, ok, err } from './result.js';
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/shared && pnpm test
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add Result<T, E> type with ok/err constructors"
```

---

### Task 3: API DTOs

**Files:**
- Create: `packages/shared/src/api.ts`
- Modify: `packages/shared/src/index.ts` — add re-exports

**Interfaces:**
- Consumes: nothing
- Produces: `CreateTransferResponse`, `UploadAttachmentResponse`, `FinalizeTransferResponse`, `TransferInfoResponse`, `AttachmentInfoDTO`

- [ ] **Step 1: Create API type definitions**

`packages/shared/src/api.ts`:
```typescript
export interface CreateTransferResponse {
  readonly transferId: string;
  readonly shareLink: string;
}

export interface UploadAttachmentResponse {
  readonly attachmentId: string;
  readonly fileName: string;
  readonly fileSize: number;
}

export interface FinalizeTransferResponse {
  readonly shareLink: string;
  readonly expiresAt: string;
}

export interface AttachmentInfoDTO {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}

export interface TransferInfoResponse {
  readonly totalSize: number;
  readonly attachments: readonly AttachmentInfoDTO[];
  readonly expiresAt: string;
  readonly expired: boolean;
}
```

- [ ] **Step 2: Re-export from index**

Add to `packages/shared/src/index.ts`:
```typescript
export type {
  CreateTransferResponse,
  UploadAttachmentResponse,
  FinalizeTransferResponse,
  TransferInfoResponse,
  AttachmentInfoDTO,
} from './api.js';
```

- [ ] **Step 3: Verify build**

```bash
cd packages/shared && pnpm build
```

Expected: compiles, no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add API response DTOs"
```
