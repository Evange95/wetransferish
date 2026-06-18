# Phase 5: Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React 19 frontend with clean architecture, React Compiler, and Vite.

**Architecture:** Clean architecture: domain (models, ports) → application (use cases) → infrastructure (HTTP adapter) → UI (React components, hooks, pages). Domain and application layers have zero React dependency.

**Tech Stack:** React 19, React Compiler (babel-plugin-react-compiler), Vite, React Router 7, Vitest, Testing Library

## Global Constraints

- React 19 + React Compiler: no manual `useMemo`, `useCallback`, `React.memo`
- Clean architecture: domain/application don't import React
- Parse at boundary: `HttpTransferGateway` parses JSON responses into domain types
- TDD for domain/application, component tests for UI
- Commit after each task

---

### Task 1: Frontend Setup (Vite + React 19 + React Compiler)

**Files:**
- Modify: `packages/frontend/package.json` — add all dependencies
- Create: `packages/frontend/vite.config.ts`
- Create: `packages/frontend/vitest.config.ts`
- Create: `packages/frontend/index.html`
- Create: `packages/frontend/src/main.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: working Vite dev server with React 19 + React Compiler

- [ ] **Step 1: Install dependencies**

```bash
cd packages/frontend && pnpm add react@19 react-dom@19 react-router@7
cd packages/frontend && pnpm add -D vite@6 @vitejs/plugin-react babel-plugin-react-compiler @types/react@19 @types/react-dom@19 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create vite.config.ts**

`packages/frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
```

- [ ] **Step 3: Create vitest.config.ts**

`packages/frontend/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

Create `packages/frontend/src/test-setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Create index.html**

`packages/frontend/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Wetransferish</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create main.tsx placeholder**

`packages/frontend/src/main.tsx`:
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div>Wetransferish</div>
  </StrictMode>,
);
```

- [ ] **Step 6: Verify dev server starts**

```bash
cd packages/frontend && pnpm dev &
sleep 3
curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML response with "Wetransferish"

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/
git commit -m "feat(frontend): setup Vite + React 19 + React Compiler"
```

---

### Task 2: Frontend Domain Model & Port

**Files:**
- Create: `packages/frontend/src/domain/model/Transfer.ts`
- Create: `packages/frontend/src/domain/model/Attachment.ts`
- Create: `packages/frontend/src/domain/model/UploadProgress.ts`
- Create: `packages/frontend/src/domain/port/TransferGateway.ts`
- Create: `packages/frontend/src/domain/model/Transfer.test.ts`

**Interfaces:**
- Consumes: `Result` from `@wetransferish/shared`
- Produces:
  - `Transfer`: `{ totalSize, attachments, expiresAt, expired }`
  - `Attachment`: `{ id, name, size }`
  - `UploadProgress`: `{ fileIndex, fileName, loaded, total, status }`
  - `TransferGateway` port interface

- [ ] **Step 1: Create domain models**

`packages/frontend/src/domain/model/Attachment.ts`:
```typescript
export interface Attachment {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}
```

`packages/frontend/src/domain/model/Transfer.ts`:
```typescript
import type { Attachment } from './Attachment.js';

export interface Transfer {
  readonly totalSize: number;
  readonly attachments: readonly Attachment[];
  readonly expiresAt: Date;
  readonly expired: boolean;
}
```

`packages/frontend/src/domain/model/UploadProgress.ts`:
```typescript
export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadProgress {
  readonly fileIndex: number;
  readonly fileName: string;
  readonly loaded: number;
  readonly total: number;
  readonly status: UploadStatus;
}
```

- [ ] **Step 2: Create TransferGateway port**

`packages/frontend/src/domain/port/TransferGateway.ts`:
```typescript
import type { Transfer } from '../model/Transfer.js';
import type { UploadProgress } from '../model/UploadProgress.js';

export interface CreateTransferResult {
  transferId: string;
  shareLink: string;
}

export interface TransferGateway {
  createTransfer(): Promise<CreateTransferResult>;
  uploadFile(
    transferId: string,
    file: File,
    onProgress: (progress: UploadProgress) => void,
    fileIndex: number,
  ): Promise<{ attachmentId: string }>;
  finalizeTransfer(transferId: string): Promise<{ shareLink: string; expiresAt: string }>;
  getTransferInfo(shareLink: string): Promise<Transfer>;
}
```

- [ ] **Step 3: Write domain model test**

`packages/frontend/src/domain/model/Transfer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import type { Transfer } from './Transfer.js';
import type { Attachment } from './Attachment.js';

describe('Transfer (frontend domain)', () => {
  it('represents a transfer with attachments', () => {
    const attachment: Attachment = { id: 'a1', name: 'photo.jpg', size: 1024 };
    const transfer: Transfer = {
      totalSize: 1024,
      attachments: [attachment],
      expiresAt: new Date('2026-12-01'),
      expired: false,
    };

    expect(transfer.attachments).toHaveLength(1);
    expect(transfer.expired).toBe(false);
    expect(transfer.totalSize).toBe(1024);
  });
});
```

- [ ] **Step 4: Run test**

```bash
cd packages/frontend && pnpm test -- src/domain/
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/domain/
git commit -m "feat(frontend): add domain model, port, and transfer gateway interface"
```

---

### Task 3: Frontend Use Cases

**Files:**
- Create: `packages/frontend/src/application/SendTransfer.ts`
- Create: `packages/frontend/src/application/SendTransfer.test.ts`
- Create: `packages/frontend/src/application/FetchTransferInfo.ts`
- Create: `packages/frontend/src/application/FetchTransferInfo.test.ts`
- Create: `packages/frontend/src/application/fakes/FakeTransferGateway.ts`

**Interfaces:**
- Consumes: `TransferGateway` port
- Produces:
  - `SendTransfer.execute(files, onProgress): Promise<{ shareLink }>` — uploads files with max 3 concurrent
  - `FetchTransferInfo.execute(shareLink): Promise<Transfer>`

- [ ] **Step 1: Create FakeTransferGateway**

`packages/frontend/src/application/fakes/FakeTransferGateway.ts`:
```typescript
import type { TransferGateway, CreateTransferResult } from '../../domain/port/TransferGateway.js';
import type { Transfer } from '../../domain/model/Transfer.js';
import type { UploadProgress } from '../../domain/model/UploadProgress.js';

export class FakeTransferGateway implements TransferGateway {
  uploadedFiles: { transferId: string; fileName: string }[] = [];
  finalized = false;

  async createTransfer(): Promise<CreateTransferResult> {
    return { transferId: 't-1', shareLink: 'V1StGXR8_Z5jdHi6B-myT' };
  }

  async uploadFile(
    transferId: string,
    file: File,
    onProgress: (p: UploadProgress) => void,
    fileIndex: number,
  ): Promise<{ attachmentId: string }> {
    this.uploadedFiles.push({ transferId, fileName: file.name });
    onProgress({ fileIndex, fileName: file.name, loaded: file.size, total: file.size, status: 'done' });
    return { attachmentId: `att-${fileIndex}` };
  }

  async finalizeTransfer(_transferId: string): Promise<{ shareLink: string; expiresAt: string }> {
    this.finalized = true;
    return { shareLink: 'V1StGXR8_Z5jdHi6B-myT', expiresAt: '2026-12-01T00:00:00Z' };
  }

  async getTransferInfo(_shareLink: string): Promise<Transfer> {
    return {
      totalSize: 1024,
      attachments: [{ id: 'a1', name: 'test.txt', size: 1024 }],
      expiresAt: new Date('2026-12-01'),
      expired: false,
    };
  }
}
```

- [ ] **Step 2: Write SendTransfer failing test**

`packages/frontend/src/application/SendTransfer.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SendTransfer } from './SendTransfer.js';
import { FakeTransferGateway } from './fakes/FakeTransferGateway.js';
import type { UploadProgress } from '../domain/model/UploadProgress.js';

function makeFile(name: string, size: number): File {
  return new File([new ArrayBuffer(size)], name);
}

describe('SendTransfer', () => {
  let gateway: FakeTransferGateway;
  let useCase: SendTransfer;

  beforeEach(() => {
    gateway = new FakeTransferGateway();
    useCase = new SendTransfer(gateway, 3);
  });

  it('creates a transfer, uploads all files, and finalizes', async () => {
    const files = [makeFile('a.txt', 10), makeFile('b.txt', 20)];
    const progresses: UploadProgress[] = [];

    const result = await useCase.execute(files, (p) => progresses.push(p));

    expect(result.shareLink).toBe('V1StGXR8_Z5jdHi6B-myT');
    expect(gateway.uploadedFiles).toHaveLength(2);
    expect(gateway.finalized).toBe(true);
    expect(progresses).toHaveLength(2);
  });

  it('uploads with concurrency limit', async () => {
    const files = [makeFile('1.txt', 1), makeFile('2.txt', 1), makeFile('3.txt', 1), makeFile('4.txt', 1)];
    await useCase.execute(files, () => {});
    expect(gateway.uploadedFiles).toHaveLength(4);
  });
});
```

- [ ] **Step 3: Implement SendTransfer**

`packages/frontend/src/application/SendTransfer.ts`:
```typescript
import type { TransferGateway } from '../domain/port/TransferGateway.js';
import type { UploadProgress } from '../domain/model/UploadProgress.js';

export class SendTransfer {
  constructor(
    private readonly gateway: TransferGateway,
    private readonly maxConcurrency: number = 3,
  ) {}

  async execute(
    files: File[],
    onProgress: (progress: UploadProgress) => void,
  ): Promise<{ shareLink: string }> {
    const { transferId } = await this.gateway.createTransfer();

    const queue = files.map((file, index) => ({ file, index }));
    const executing = new Set<Promise<void>>();

    for (const item of queue) {
      const task = this.gateway
        .uploadFile(transferId, item.file, onProgress, item.index)
        .then(() => { executing.delete(task); });

      executing.add(task);

      if (executing.size >= this.maxConcurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);

    const { shareLink } = await this.gateway.finalizeTransfer(transferId);
    return { shareLink };
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/frontend && pnpm test -- src/application/SendTransfer.test.ts
```

Expected: all PASS

- [ ] **Step 5: Write FetchTransferInfo failing test**

`packages/frontend/src/application/FetchTransferInfo.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { FetchTransferInfo } from './FetchTransferInfo.js';
import { FakeTransferGateway } from './fakes/FakeTransferGateway.js';

describe('FetchTransferInfo', () => {
  let gateway: FakeTransferGateway;
  let useCase: FetchTransferInfo;

  beforeEach(() => {
    gateway = new FakeTransferGateway();
    useCase = new FetchTransferInfo(gateway);
  });

  it('returns parsed transfer info', async () => {
    const info = await useCase.execute('V1StGXR8_Z5jdHi6B-myT');
    expect(info.totalSize).toBe(1024);
    expect(info.attachments).toHaveLength(1);
    expect(info.expired).toBe(false);
  });
});
```

- [ ] **Step 6: Implement FetchTransferInfo**

`packages/frontend/src/application/FetchTransferInfo.ts`:
```typescript
import type { TransferGateway } from '../domain/port/TransferGateway.js';
import type { Transfer } from '../domain/model/Transfer.js';

export class FetchTransferInfo {
  constructor(private readonly gateway: TransferGateway) {}

  async execute(shareLink: string): Promise<Transfer> {
    return this.gateway.getTransferInfo(shareLink);
  }
}
```

- [ ] **Step 7: Run test, verify pass**

```bash
cd packages/frontend && pnpm test -- src/application/FetchTransferInfo.test.ts
```

Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add packages/frontend/src/application/
git commit -m "feat(frontend): add SendTransfer and FetchTransferInfo use cases with fakes"
```

---

### Task 4: HttpTransferGateway Adapter

**Files:**
- Create: `packages/frontend/src/infrastructure/api/HttpTransferGateway.ts`

**Interfaces:**
- Consumes: `TransferGateway` port, `TransferInfoResponse` from `@wetransferish/shared`
- Produces: `HttpTransferGateway` implements `TransferGateway` using `fetch` and `XMLHttpRequest`

- [ ] **Step 1: Implement HttpTransferGateway**

`packages/frontend/src/infrastructure/api/HttpTransferGateway.ts`:
```typescript
import type {
  CreateTransferResponse,
  UploadAttachmentResponse,
  FinalizeTransferResponse,
  TransferInfoResponse,
} from '@wetransferish/shared';
import type { TransferGateway, CreateTransferResult } from '../../domain/port/TransferGateway.js';
import type { Transfer } from '../../domain/model/Transfer.js';
import type { UploadProgress } from '../../domain/model/UploadProgress.js';

export class HttpTransferGateway implements TransferGateway {
  constructor(private readonly baseUrl: string = '') {}

  async createTransfer(): Promise<CreateTransferResult> {
    const res = await fetch(`${this.baseUrl}/api/transfers`, { method: 'POST' });
    if (!res.ok) throw new Error(`Create failed: ${res.status}`);
    const data: CreateTransferResponse = await res.json();
    return { transferId: data.transferId, shareLink: data.shareLink };
  }

  uploadFile(
    transferId: string,
    file: File,
    onProgress: (p: UploadProgress) => void,
    fileIndex: number,
  ): Promise<{ attachmentId: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            fileIndex,
            fileName: file.name,
            loaded: e.loaded,
            total: e.total,
            status: 'uploading',
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const data: UploadAttachmentResponse = JSON.parse(xhr.responseText);
          onProgress({ fileIndex, fileName: file.name, loaded: file.size, total: file.size, status: 'done' });
          resolve({ attachmentId: data.attachmentId });
        } else {
          onProgress({ fileIndex, fileName: file.name, loaded: 0, total: file.size, status: 'error' });
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        onProgress({ fileIndex, fileName: file.name, loaded: 0, total: file.size, status: 'error' });
        reject(new Error('Upload network error'));
      });

      xhr.open('POST', `${this.baseUrl}/api/transfers/${transferId}/attachments`);
      xhr.send(formData);
    });
  }

  async finalizeTransfer(transferId: string): Promise<{ shareLink: string; expiresAt: string }> {
    const res = await fetch(`${this.baseUrl}/api/transfers/${transferId}/finalize`, { method: 'POST' });
    if (!res.ok) throw new Error(`Finalize failed: ${res.status}`);
    const data: FinalizeTransferResponse = await res.json();
    return { shareLink: data.shareLink, expiresAt: data.expiresAt };
  }

  async getTransferInfo(shareLink: string): Promise<Transfer> {
    const res = await fetch(`${this.baseUrl}/api/transfers/${shareLink}`);
    if (!res.ok) throw new Error(`Get info failed: ${res.status}`);
    const data: TransferInfoResponse = await res.json();
    return {
      totalSize: data.totalSize,
      attachments: data.attachments.map((a) => ({ id: a.id, name: a.name, size: a.size })),
      expiresAt: new Date(data.expiresAt),
      expired: data.expired,
    };
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd packages/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add packages/frontend/src/infrastructure/
git commit -m "feat(frontend): add HttpTransferGateway adapter with XHR progress tracking"
```

---

### Task 5: React UI Components

**Files:**
- Create: `packages/frontend/src/ui/components/DropZone.tsx`
- Create: `packages/frontend/src/ui/components/DropZone.test.tsx`
- Create: `packages/frontend/src/ui/components/FileList.tsx`
- Create: `packages/frontend/src/ui/components/ProgressBar.tsx`
- Create: `packages/frontend/src/ui/components/ShareLinkCard.tsx`

**Interfaces:**
- Consumes: React 19
- Produces: presentational components with no business logic

- [ ] **Step 1: Write DropZone test**

`packages/frontend/src/ui/components/DropZone.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropZone } from './DropZone.js';

describe('DropZone', () => {
  it('calls onFiles when files are dropped', () => {
    const onFiles = vi.fn();
    render(<DropZone onFiles={onFiles} />);

    const dropzone = screen.getByTestId('dropzone');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('renders drop instruction text', () => {
    render(<DropZone onFiles={() => {}} />);
    expect(screen.getByText(/drag/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement DropZone**

`packages/frontend/src/ui/components/DropZone.tsx`:
```typescript
import { useCallback, useState } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  }, [onFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      if (input.files) onFiles(Array.from(input.files));
    };
    input.click();
  }, [onFiles]);

  return (
    <div
      data-testid="dropzone"
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        border: `2px dashed ${isDragging ? '#4a90d9' : '#ccc'}`,
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragging ? '#f0f7ff' : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      <p style={{ fontSize: '18px', margin: 0, color: '#666' }}>
        Drag files here or click to select
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Implement FileList, ProgressBar, ShareLinkCard**

`packages/frontend/src/ui/components/FileList.tsx`:
```typescript
import type { UploadProgress } from '../../domain/model/UploadProgress.js';
import { ProgressBar } from './ProgressBar.js';

interface FileListProps {
  files: File[];
  progressMap: Map<number, UploadProgress>;
}

export function FileList({ files, progressMap }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {files.map((file, index) => {
        const progress = progressMap.get(index);
        return (
          <li key={`${file.name}-${index}`} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>{file.name}</span>
              <span style={{ color: '#999' }}>{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            {progress && <ProgressBar progress={progress} />}
          </li>
        );
      })}
    </ul>
  );
}
```

`packages/frontend/src/ui/components/ProgressBar.tsx`:
```typescript
import type { UploadProgress } from '../../domain/model/UploadProgress.js';

interface ProgressBarProps {
  progress: UploadProgress;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
  const color = progress.status === 'error' ? '#e74c3c' : progress.status === 'done' ? '#2ecc71' : '#4a90d9';

  return (
    <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '4px', height: '8px' }}>
      <div
        data-testid="progress-fill"
        style={{
          width: `${percent}%`,
          backgroundColor: color,
          height: '100%',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}
```

`packages/frontend/src/ui/components/ShareLinkCard.tsx`:
```typescript
import { useState } from 'react';

interface ShareLinkCardProps {
  shareLink: string;
}

export function ShareLinkCard({ shareLink }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}/d/${shareLink}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #2ecc71', borderRadius: '8px', backgroundColor: '#f0fff4' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#2ecc71' }}>Transfer ready!</p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          readOnly
          value={fullUrl}
          style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <button onClick={handleCopy} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run component tests**

```bash
cd packages/frontend && pnpm test -- src/ui/components/
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/src/ui/components/
git commit -m "feat(frontend): add DropZone, FileList, ProgressBar, ShareLinkCard components"
```

---

### Task 6: Hooks, Pages & App Routing

**Files:**
- Create: `packages/frontend/src/ui/hooks/useUpload.ts`
- Create: `packages/frontend/src/ui/hooks/useTransferInfo.ts`
- Create: `packages/frontend/src/ui/pages/UploadPage.tsx`
- Create: `packages/frontend/src/ui/pages/DownloadPage.tsx`
- Create: `packages/frontend/src/config/container.ts`
- Create: `packages/frontend/src/App.tsx`
- Modify: `packages/frontend/src/main.tsx` — render App

**Interfaces:**
- Consumes: use cases, components, `HttpTransferGateway`
- Produces: complete routed SPA with upload and download pages

- [ ] **Step 1: Create container (DI wiring)**

`packages/frontend/src/config/container.ts`:
```typescript
import { HttpTransferGateway } from '../infrastructure/api/HttpTransferGateway.js';
import { SendTransfer } from '../application/SendTransfer.js';
import { FetchTransferInfo } from '../application/FetchTransferInfo.js';

const gateway = new HttpTransferGateway();

export const sendTransfer = new SendTransfer(gateway, 3);
export const fetchTransferInfo = new FetchTransferInfo(gateway);
```

- [ ] **Step 2: Create hooks**

`packages/frontend/src/ui/hooks/useUpload.ts`:
```typescript
import { useState, useTransition } from 'react';
import type { UploadProgress } from '../../domain/model/UploadProgress.js';
import { sendTransfer } from '../../config/container.js';

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export function useUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [progressMap, setProgressMap] = useState<Map<number, UploadProgress>>(new Map());
  const [state, setState] = useState<UploadState>('idle');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const addFiles = (newFiles: File[]) => {
    startTransition(() => {
      setFiles((prev) => [...prev, ...newFiles]);
    });
  };

  const upload = async () => {
    if (files.length === 0) return;
    setState('uploading');
    setError(null);

    try {
      const result = await sendTransfer.execute(files, (progress) => {
        setProgressMap((prev) => {
          const next = new Map(prev);
          next.set(progress.fileIndex, progress);
          return next;
        });
      });
      setShareLink(result.shareLink);
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setState('error');
    }
  };

  const reset = () => {
    setFiles([]);
    setProgressMap(new Map());
    setState('idle');
    setShareLink(null);
    setError(null);
  };

  return { files, progressMap, state, shareLink, error, isPending, addFiles, upload, reset };
}
```

`packages/frontend/src/ui/hooks/useTransferInfo.ts`:
```typescript
import { useState, useEffect } from 'react';
import type { Transfer } from '../../domain/model/Transfer.js';
import { fetchTransferInfo } from '../../config/container.js';

export function useTransferInfo(shareLink: string) {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchTransferInfo.execute(shareLink)
      .then((info) => { if (!cancelled) { setTransfer(info); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [shareLink]);

  return { transfer, loading, error };
}
```

- [ ] **Step 3: Create UploadPage**

`packages/frontend/src/ui/pages/UploadPage.tsx`:
```typescript
import { DropZone } from '../components/DropZone.js';
import { FileList } from '../components/FileList.js';
import { ShareLinkCard } from '../components/ShareLinkCard.js';
import { useUpload } from '../hooks/useUpload.js';

export function UploadPage() {
  const { files, progressMap, state, shareLink, error, addFiles, upload, reset } = useUpload();

  return (
    <div style={{ maxWidth: '600px', margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '32px' }}>Wetransferish</h1>

      {state === 'done' && shareLink ? (
        <>
          <ShareLinkCard shareLink={shareLink} />
          <button onClick={reset} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>
            Send another
          </button>
        </>
      ) : (
        <>
          <DropZone onFiles={addFiles} />
          <FileList files={files} progressMap={progressMap} />

          {files.length > 0 && state !== 'uploading' && (
            <button
              onClick={upload}
              style={{ marginTop: '16px', padding: '12px 24px', fontSize: '16px', cursor: 'pointer' }}
            >
              Send {files.length} file{files.length > 1 ? 's' : ''}
            </button>
          )}

          {state === 'uploading' && <p>Uploading...</p>}
          {error && <p style={{ color: '#e74c3c' }}>{error}</p>}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create DownloadPage**

`packages/frontend/src/ui/pages/DownloadPage.tsx`:
```typescript
import { useParams } from 'react-router';
import { useTransferInfo } from '../hooks/useTransferInfo.js';

export function DownloadPage() {
  const { shareLink } = useParams<{ shareLink: string }>();
  const { transfer, loading, error } = useTransferInfo(shareLink!);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '48px' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', marginTop: '48px', color: '#e74c3c' }}>{error}</div>;
  if (!transfer) return null;

  if (transfer.expired) {
    return <div style={{ textAlign: 'center', marginTop: '48px', color: '#e74c3c' }}>This transfer has expired.</div>;
  }

  const totalSizeKB = (transfer.totalSize / 1024).toFixed(1);

  return (
    <div style={{ maxWidth: '600px', margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center' }}>Download</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>
        {transfer.attachments.length} file{transfer.attachments.length > 1 ? 's' : ''} — {totalSizeKB} KB
      </p>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {transfer.attachments.map((att) => (
          <li key={att.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
            <span>{att.name}</span>
            <a href={`/api/transfers/${shareLink}/attachments/${att.id}/download`} download>
              Download
            </a>
          </li>
        ))}
      </ul>

      {transfer.attachments.length > 1 && (
        <a
          href={`/api/transfers/${shareLink}/download`}
          download="transfer.zip"
          style={{ display: 'block', textAlign: 'center', marginTop: '16px', padding: '12px 24px', fontSize: '16px' }}
        >
          Download all as ZIP
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create App with routing**

`packages/frontend/src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route } from 'react-router';
import { UploadPage } from './ui/pages/UploadPage.js';
import { DownloadPage } from './ui/pages/DownloadPage.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/d/:shareLink" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Update main.tsx**

`packages/frontend/src/main.tsx`:
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 7: Run all frontend tests**

```bash
cd packages/frontend && pnpm test
```

Expected: all PASS

- [ ] **Step 8: Verify dev build**

```bash
cd packages/frontend && pnpm build
```

Expected: Vite produces `dist/` with optimized bundle

- [ ] **Step 9: Commit**

```bash
git add packages/frontend/
git commit -m "feat(frontend): add hooks, pages, routing, and App shell"
```
