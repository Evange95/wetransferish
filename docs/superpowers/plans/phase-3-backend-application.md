# Phase 3: Backend Application Layer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all use cases and in-memory fakes for testing. The application layer orchestrates domain objects and calls ports.

**Architecture:** Each use case is a class with an `execute()` method. Dependencies are injected via constructor. All use cases return `Result<T, E>`. In-memory fakes implement ports for fast, deterministic tests.

**Tech Stack:** TypeScript 5.9, Vitest, domain model from Phase 2

## Global Constraints

- No external dependencies — only domain model and ports
- All use cases return `Result<T, E>`
- TDD: Red → Green → Refactor
- Commit after each task

---

### Task 1: Application Errors & In-Memory Fakes

**Files:**
- Create: `packages/backend/src/application/errors.ts`
- Create: `packages/backend/src/application/fakes/InMemoryTransferRepository.ts`
- Create: `packages/backend/src/application/fakes/InMemoryFileStorage.ts`
- Create: `packages/backend/src/application/fakes/StubIdGenerator.ts`
- Create: `packages/backend/src/application/fakes/FakeArchiveCreator.ts`

**Interfaces:**
- Consumes: port interfaces from Phase 2
- Produces:
  - Error classes: `TransferNotFound`, `TransferNotDownloadable`, `AttachmentNotFound`, `InvalidConfiguration`
  - `InMemoryTransferRepository` implements `TransferRepository`
  - `InMemoryFileStorage` implements `FileStorage` — has `has(key): boolean` for test assertions
  - `StubIdGenerator` implements `IdGenerator` — deterministic IDs: `id-1`, `id-2`, ... and share links `link-0000000000000001`, etc.
  - `FakeArchiveCreator` implements `ArchiveCreator` — concatenates streams for test assertions

- [ ] **Step 1: Create application errors**

`packages/backend/src/application/errors.ts`:
```typescript
export class TransferNotFound {
  readonly _tag = 'TransferNotFound' as const;
  readonly message = 'Transfer not found';
}

export class TransferNotDownloadable {
  readonly _tag = 'TransferNotDownloadable' as const;
  readonly message = 'Transfer is not downloadable';
}

export class AttachmentNotFound {
  readonly _tag = 'AttachmentNotFound' as const;
  readonly message = 'Attachment not found';
}

export class InvalidConfiguration {
  readonly _tag = 'InvalidConfiguration' as const;
  constructor(readonly message: string) {}
}
```

- [ ] **Step 2: Create InMemoryTransferRepository**

`packages/backend/src/application/fakes/InMemoryTransferRepository.ts`:
```typescript
import type { TransferRepository } from '../../domain/port/TransferRepository.js';
import type { Transfer } from '../../domain/model/Transfer.js';
import type { ShareLink } from '../../domain/model/ShareLink.js';

export class InMemoryTransferRepository implements TransferRepository {
  private readonly transfers = new Map<string, Transfer>();

  async save(transfer: Transfer): Promise<void> {
    this.transfers.set(transfer.id, transfer);
  }

  async findById(id: string): Promise<Transfer | null> {
    return this.transfers.get(id) ?? null;
  }

  async findByShareLink(shareLink: ShareLink): Promise<Transfer | null> {
    for (const transfer of this.transfers.values()) {
      if (transfer.shareLink.equals(shareLink)) return transfer;
    }
    return null;
  }
}
```

- [ ] **Step 3: Create InMemoryFileStorage**

`packages/backend/src/application/fakes/InMemoryFileStorage.ts`:
```typescript
import { Readable } from 'node:stream';
import type { FileStorage } from '../../domain/port/FileStorage.js';
import type { StorageKey } from '../../domain/model/StorageKey.js';
import type { FileSize } from '../../domain/model/FileSize.js';

export class InMemoryFileStorage implements FileStorage {
  private readonly files = new Map<string, Buffer>();

  async store(key: StorageKey, stream: Readable, _size: FileSize): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    this.files.set(key.value, Buffer.concat(chunks));
  }

  async retrieve(key: StorageKey): Promise<Readable> {
    const data = this.files.get(key.value);
    if (!data) throw new Error(`File not found: ${key.value}`);
    return Readable.from(data);
  }

  has(key: StorageKey): boolean {
    return this.files.has(key.value);
  }

  getBuffer(key: StorageKey): Buffer | undefined {
    return this.files.get(key.value);
  }
}
```

- [ ] **Step 4: Create StubIdGenerator**

`packages/backend/src/application/fakes/StubIdGenerator.ts`:
```typescript
import type { IdGenerator } from '../../domain/port/IdGenerator.js';
import { ShareLink } from '../../domain/model/ShareLink.js';

export class StubIdGenerator implements IdGenerator {
  private idCounter = 0;
  private shareLinkCounter = 0;

  generateId(): string {
    return `id-${++this.idCounter}`;
  }

  generateShareLink(): ShareLink {
    const raw = `link-${String(++this.shareLinkCounter).padStart(16, '0')}`;
    const result = ShareLink.create(raw);
    if (!result.ok) throw new Error(`StubIdGenerator produced invalid ShareLink: ${raw}`);
    return result.value;
  }
}
```

- [ ] **Step 5: Create FakeArchiveCreator**

`packages/backend/src/application/fakes/FakeArchiveCreator.ts`:
```typescript
import { Readable, PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ArchiveCreator, ArchiveEntry } from '../../domain/port/ArchiveCreator.js';

export class FakeArchiveCreator implements ArchiveCreator {
  createZip(entries: ArchiveEntry[]): Readable {
    const output = new PassThrough();

    (async () => {
      for (const entry of entries) {
        const header = Buffer.from(`--- ${entry.name} ---\n`);
        output.write(header);
        await pipeline(entry.stream, output, { end: false });
      }
      output.end();
    })().catch((err) => output.destroy(err));

    return output;
  }
}
```

- [ ] **Step 6: Verify compilation**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add packages/backend/src/application/
git commit -m "feat(backend): add application errors and in-memory fakes"
```

---

### Task 2: CreateTransfer Use Case

**Files:**
- Create: `packages/backend/src/application/CreateTransfer.ts`
- Create: `packages/backend/src/application/CreateTransfer.test.ts`

**Interfaces:**
- Consumes: `TransferRepository`, `IdGenerator`, `Expiry` from domain
- Produces: `CreateTransfer.execute(): Promise<Result<{ transferId: string; shareLink: ShareLink }, CreateTransferError>>`

- [ ] **Step 1: Write failing test**

`packages/backend/src/application/CreateTransfer.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CreateTransfer } from './CreateTransfer.js';
import { InMemoryTransferRepository } from './fakes/InMemoryTransferRepository.js';
import { StubIdGenerator } from './fakes/StubIdGenerator.js';

describe('CreateTransfer', () => {
  let repo: InMemoryTransferRepository;
  let idGen: StubIdGenerator;
  let useCase: CreateTransfer;

  beforeEach(() => {
    repo = new InMemoryTransferRepository();
    idGen = new StubIdGenerator();
    useCase = new CreateTransfer(repo, idGen, 7, 10_000_000);
  });

  it('creates a transfer in collecting state', async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const transfer = await repo.findById(result.value.transferId);
    expect(transfer).not.toBeNull();
    expect(transfer!.status).toBe('collecting');
  });

  it('returns transferId and shareLink', async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.transferId).toBe('id-1');
    expect(result.value.shareLink.value).toBe('link-0000000000000001');
  });

  it('assigns a future expiry', async () => {
    const result = await useCase.execute();
    if (!result.ok) return;

    const transfer = await repo.findById(result.value.transferId);
    expect(transfer!.isExpired()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/application/CreateTransfer.test.ts
```

- [ ] **Step 3: Implement**

`packages/backend/src/application/CreateTransfer.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { IdGenerator } from '../domain/port/IdGenerator.js';
import { Transfer } from '../domain/model/Transfer.js';
import { Expiry } from '../domain/model/Expiry.js';
import { ShareLink } from '../domain/model/ShareLink.js';
import { InvalidConfiguration } from './errors.js';

export type CreateTransferError = InvalidConfiguration;

export class CreateTransfer {
  constructor(
    private readonly repo: TransferRepository,
    private readonly idGen: IdGenerator,
    private readonly defaultExpiryDays: number,
    private readonly maxTotalSizeBytes: number,
  ) {}

  async execute(): Promise<Result<{ transferId: string; shareLink: ShareLink }, CreateTransferError>> {
    const id = this.idGen.generateId();
    const shareLink = this.idGen.generateShareLink();

    const expiryResult = Expiry.fromNow(this.defaultExpiryDays);
    if (!expiryResult.ok) return err(new InvalidConfiguration(expiryResult.error.message));

    const transfer = Transfer.create(id, shareLink, expiryResult.value, this.maxTotalSizeBytes);
    await this.repo.save(transfer);

    return ok({ transferId: id, shareLink });
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/application/CreateTransfer.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/CreateTransfer*
git commit -m "feat(backend): add CreateTransfer use case"
```

---

### Task 3: UploadAttachment Use Case

**Files:**
- Create: `packages/backend/src/application/UploadAttachment.ts`
- Create: `packages/backend/src/application/UploadAttachment.test.ts`

**Interfaces:**
- Consumes: `TransferRepository`, `FileStorage`, `IdGenerator`, `FileName`, `FileSize`, `Readable`
- Produces: `UploadAttachment.execute(transferId, fileName, fileSize, stream): Promise<Result<Attachment, UploadAttachmentError>>`

- [ ] **Step 1: Write failing test**

`packages/backend/src/application/UploadAttachment.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { UploadAttachment } from './UploadAttachment.js';
import { CreateTransfer } from './CreateTransfer.js';
import { InMemoryTransferRepository } from './fakes/InMemoryTransferRepository.js';
import { InMemoryFileStorage } from './fakes/InMemoryFileStorage.js';
import { StubIdGenerator } from './fakes/StubIdGenerator.js';
import { FileName } from '../domain/model/FileName.js';
import { FileSize } from '../domain/model/FileSize.js';
import { StorageKey } from '../domain/model/StorageKey.js';

describe('UploadAttachment', () => {
  let repo: InMemoryTransferRepository;
  let storage: InMemoryFileStorage;
  let idGen: StubIdGenerator;
  let uploadUseCase: UploadAttachment;
  let transferId: string;

  beforeEach(async () => {
    repo = new InMemoryTransferRepository();
    storage = new InMemoryFileStorage();
    idGen = new StubIdGenerator();
    const createUseCase = new CreateTransfer(repo, idGen, 7, 10_000_000);
    const createResult = await createUseCase.execute();
    if (!createResult.ok) throw new Error('setup');
    transferId = createResult.value.transferId;
    uploadUseCase = new UploadAttachment(repo, storage, idGen);
  });

  it('stores file and adds attachment to transfer', async () => {
    const fn = FileName.create('photo.jpg');
    const fs = FileSize.create(5);
    if (!fn.ok || !fs.ok) throw new Error('setup');

    const stream = Readable.from(Buffer.from('hello'));
    const result = await uploadUseCase.execute(transferId, fn.value, fs.value, stream);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fileName.value).toBe('photo.jpg');

    const transfer = await repo.findById(transferId);
    expect(transfer!.attachments).toHaveLength(1);

    const storedKey = StorageKey.create(`${transferId}/${result.value.id}`);
    if (storedKey.ok) expect(storage.has(storedKey.value)).toBe(true);
  });

  it('returns TransferNotFound for unknown transferId', async () => {
    const fn = FileName.create('f.txt');
    const fs = FileSize.create(1);
    if (!fn.ok || !fs.ok) throw new Error('setup');

    const result = await uploadUseCase.execute('unknown', fn.value, fs.value, Readable.from(Buffer.alloc(0)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error._tag).toBe('TransferNotFound');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/application/UploadAttachment.test.ts
```

- [ ] **Step 3: Implement**

`packages/backend/src/application/UploadAttachment.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';
import type { Readable } from 'node:stream';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { FileStorage } from '../domain/port/FileStorage.js';
import type { IdGenerator } from '../domain/port/IdGenerator.js';
import type { FileName } from '../domain/model/FileName.js';
import type { FileSize } from '../domain/model/FileSize.js';
import { Attachment } from '../domain/model/Attachment.js';
import { StorageKey } from '../domain/model/StorageKey.js';
import { TransferNotFound } from './errors.js';
import type { TransferError } from '../domain/model/Transfer.js';

export type UploadAttachmentError = TransferNotFound | TransferError;

export class UploadAttachment {
  constructor(
    private readonly repo: TransferRepository,
    private readonly storage: FileStorage,
    private readonly idGen: IdGenerator,
  ) {}

  async execute(
    transferId: string,
    fileName: FileName,
    fileSize: FileSize,
    stream: Readable,
  ): Promise<Result<Attachment, UploadAttachmentError>> {
    const transfer = await this.repo.findById(transferId);
    if (!transfer) return err(new TransferNotFound());

    const attachmentId = this.idGen.generateId();
    const storageKeyResult = StorageKey.create(`${transferId}/${attachmentId}`);
    if (!storageKeyResult.ok) throw new Error(`Invalid storage key: ${storageKeyResult.error.message}`);
    const storageKey = storageKeyResult.value;

    const attachment = new Attachment(attachmentId, fileName, fileSize, storageKey);

    const addResult = transfer.addAttachment(attachment);
    if (!addResult.ok) return err(addResult.error);

    await this.storage.store(storageKey, stream, fileSize);
    await this.repo.save(transfer);

    return ok(attachment);
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/application/UploadAttachment.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/UploadAttachment*
git commit -m "feat(backend): add UploadAttachment use case"
```

---

### Task 4: FinalizeTransfer Use Case

**Files:**
- Create: `packages/backend/src/application/FinalizeTransfer.ts`
- Create: `packages/backend/src/application/FinalizeTransfer.test.ts`

**Interfaces:**
- Consumes: `TransferRepository`
- Produces: `FinalizeTransfer.execute(transferId): Promise<Result<{ shareLink: ShareLink; expiresAt: Date }, FinalizeTransferError>>`

- [ ] **Step 1: Write failing test**

`packages/backend/src/application/FinalizeTransfer.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { FinalizeTransfer } from './FinalizeTransfer.js';
import { CreateTransfer } from './CreateTransfer.js';
import { UploadAttachment } from './UploadAttachment.js';
import { InMemoryTransferRepository } from './fakes/InMemoryTransferRepository.js';
import { InMemoryFileStorage } from './fakes/InMemoryFileStorage.js';
import { StubIdGenerator } from './fakes/StubIdGenerator.js';
import { FileName } from '../domain/model/FileName.js';
import { FileSize } from '../domain/model/FileSize.js';

describe('FinalizeTransfer', () => {
  let repo: InMemoryTransferRepository;
  let storage: InMemoryFileStorage;
  let idGen: StubIdGenerator;
  let finalizeUseCase: FinalizeTransfer;
  let transferId: string;

  beforeEach(async () => {
    repo = new InMemoryTransferRepository();
    storage = new InMemoryFileStorage();
    idGen = new StubIdGenerator();

    const createResult = await new CreateTransfer(repo, idGen, 7, 10_000_000).execute();
    if (!createResult.ok) throw new Error('setup');
    transferId = createResult.value.transferId;

    const fn = FileName.create('f.txt');
    const fs = FileSize.create(5);
    if (!fn.ok || !fs.ok) throw new Error('setup');
    await new UploadAttachment(repo, storage, idGen).execute(
      transferId, fn.value, fs.value, Readable.from(Buffer.from('hello')),
    );

    finalizeUseCase = new FinalizeTransfer(repo);
  });

  it('transitions transfer to ready', async () => {
    const result = await finalizeUseCase.execute(transferId);
    expect(result.ok).toBe(true);

    const transfer = await repo.findById(transferId);
    expect(transfer!.status).toBe('ready');
  });

  it('returns shareLink and expiresAt', async () => {
    const result = await finalizeUseCase.execute(transferId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.shareLink.value).toBeTruthy();
    expect(result.value.expiresAt).toBeInstanceOf(Date);
  });

  it('returns TransferNotFound for unknown id', async () => {
    const result = await finalizeUseCase.execute('unknown');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error._tag).toBe('TransferNotFound');
  });

  it('fails to finalize twice', async () => {
    await finalizeUseCase.execute(transferId);
    const result = await finalizeUseCase.execute(transferId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error._tag).toBe('TransferNotCollecting');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/application/FinalizeTransfer.test.ts
```

- [ ] **Step 3: Implement**

`packages/backend/src/application/FinalizeTransfer.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { ShareLink } from '../domain/model/ShareLink.js';
import type { TransferError } from '../domain/model/Transfer.js';
import { TransferNotFound } from './errors.js';

export type FinalizeTransferError = TransferNotFound | TransferError;

export class FinalizeTransfer {
  constructor(private readonly repo: TransferRepository) {}

  async execute(
    transferId: string,
  ): Promise<Result<{ shareLink: ShareLink; expiresAt: Date }, FinalizeTransferError>> {
    const transfer = await this.repo.findById(transferId);
    if (!transfer) return err(new TransferNotFound());

    const finalizeResult = transfer.finalize();
    if (!finalizeResult.ok) return err(finalizeResult.error);

    await this.repo.save(transfer);

    return ok({
      shareLink: transfer.shareLink,
      expiresAt: transfer.expiry.date,
    });
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/application/FinalizeTransfer.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/FinalizeTransfer*
git commit -m "feat(backend): add FinalizeTransfer use case"
```

---

### Task 5: GetTransferInfo Use Case

**Files:**
- Create: `packages/backend/src/application/GetTransferInfo.ts`
- Create: `packages/backend/src/application/GetTransferInfo.test.ts`

**Interfaces:**
- Consumes: `TransferRepository`, `ShareLink`
- Produces: `GetTransferInfo.execute(shareLink): Promise<Result<TransferInfo, GetTransferInfoError>>`
  - `TransferInfo`: `{ totalSize: number; attachments: { id, name, size }[]; expiresAt: Date; expired: boolean }`

- [ ] **Step 1: Write failing test**

`packages/backend/src/application/GetTransferInfo.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { GetTransferInfo } from './GetTransferInfo.js';
import { CreateTransfer } from './CreateTransfer.js';
import { UploadAttachment } from './UploadAttachment.js';
import { FinalizeTransfer } from './FinalizeTransfer.js';
import { InMemoryTransferRepository } from './fakes/InMemoryTransferRepository.js';
import { InMemoryFileStorage } from './fakes/InMemoryFileStorage.js';
import { StubIdGenerator } from './fakes/StubIdGenerator.js';
import { FileName } from '../domain/model/FileName.js';
import { FileSize } from '../domain/model/FileSize.js';
import { ShareLink } from '../domain/model/ShareLink.js';

describe('GetTransferInfo', () => {
  let repo: InMemoryTransferRepository;
  let storage: InMemoryFileStorage;
  let idGen: StubIdGenerator;
  let getInfoUseCase: GetTransferInfo;
  let shareLink: ShareLink;

  beforeEach(async () => {
    repo = new InMemoryTransferRepository();
    storage = new InMemoryFileStorage();
    idGen = new StubIdGenerator();

    const createResult = await new CreateTransfer(repo, idGen, 7, 10_000_000).execute();
    if (!createResult.ok) throw new Error('setup');
    shareLink = createResult.value.shareLink;

    const fn = FileName.create('photo.jpg');
    const fs = FileSize.create(2048);
    if (!fn.ok || !fs.ok) throw new Error('setup');
    await new UploadAttachment(repo, storage, idGen).execute(
      createResult.value.transferId, fn.value, fs.value, Readable.from(Buffer.alloc(2048)),
    );
    await new FinalizeTransfer(repo).execute(createResult.value.transferId);

    getInfoUseCase = new GetTransferInfo(repo);
  });

  it('returns transfer info', async () => {
    const result = await getInfoUseCase.execute(shareLink);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.totalSize).toBe(2048);
    expect(result.value.attachments).toHaveLength(1);
    expect(result.value.attachments[0].name).toBe('photo.jpg');
    expect(result.value.attachments[0].size).toBe(2048);
    expect(result.value.expired).toBe(false);
    expect(result.value.expiresAt).toBeInstanceOf(Date);
  });

  it('returns TransferNotFound for unknown shareLink', async () => {
    const unknown = ShareLink.create('XXXXXXXXXXXXXXXXXXXXZ');
    if (!unknown.ok) throw new Error('setup');
    const result = await getInfoUseCase.execute(unknown.value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error._tag).toBe('TransferNotFound');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/application/GetTransferInfo.test.ts
```

- [ ] **Step 3: Implement**

`packages/backend/src/application/GetTransferInfo.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { ShareLink } from '../domain/model/ShareLink.js';
import { TransferNotFound } from './errors.js';

export interface TransferInfo {
  totalSize: number;
  attachments: readonly { id: string; name: string; size: number }[];
  expiresAt: Date;
  expired: boolean;
}

export type GetTransferInfoError = TransferNotFound;

export class GetTransferInfo {
  constructor(private readonly repo: TransferRepository) {}

  async execute(shareLink: ShareLink): Promise<Result<TransferInfo, GetTransferInfoError>> {
    const transfer = await this.repo.findByShareLink(shareLink);
    if (!transfer) return err(new TransferNotFound());

    return ok({
      totalSize: transfer.totalSizeBytes(),
      attachments: transfer.attachments.map((a) => ({
        id: a.id,
        name: a.fileName.value,
        size: a.fileSize.bytes,
      })),
      expiresAt: transfer.expiry.date,
      expired: transfer.isExpired(),
    });
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/application/GetTransferInfo.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/GetTransferInfo*
git commit -m "feat(backend): add GetTransferInfo use case"
```

---

### Task 6: DownloadAttachment Use Case

**Files:**
- Create: `packages/backend/src/application/DownloadAttachment.ts`
- Create: `packages/backend/src/application/DownloadAttachment.test.ts`

**Interfaces:**
- Consumes: `TransferRepository`, `FileStorage`, `ShareLink`
- Produces: `DownloadAttachment.execute(shareLink, attachmentId): Promise<Result<{ stream, fileName, fileSize }, DownloadAttachmentError>>`

- [ ] **Step 1: Write failing test**

`packages/backend/src/application/DownloadAttachment.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { DownloadAttachment } from './DownloadAttachment.js';
import { CreateTransfer } from './CreateTransfer.js';
import { UploadAttachment } from './UploadAttachment.js';
import { FinalizeTransfer } from './FinalizeTransfer.js';
import { InMemoryTransferRepository } from './fakes/InMemoryTransferRepository.js';
import { InMemoryFileStorage } from './fakes/InMemoryFileStorage.js';
import { StubIdGenerator } from './fakes/StubIdGenerator.js';
import { FileName } from '../domain/model/FileName.js';
import { FileSize } from '../domain/model/FileSize.js';
import { ShareLink } from '../domain/model/ShareLink.js';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf-8');
}

describe('DownloadAttachment', () => {
  let repo: InMemoryTransferRepository;
  let storage: InMemoryFileStorage;
  let idGen: StubIdGenerator;
  let downloadUseCase: DownloadAttachment;
  let shareLink: ShareLink;
  let attachmentId: string;

  beforeEach(async () => {
    repo = new InMemoryTransferRepository();
    storage = new InMemoryFileStorage();
    idGen = new StubIdGenerator();

    const createResult = await new CreateTransfer(repo, idGen, 7, 10_000_000).execute();
    if (!createResult.ok) throw new Error('setup');
    shareLink = createResult.value.shareLink;

    const fn = FileName.create('doc.txt');
    const fs = FileSize.create(11);
    if (!fn.ok || !fs.ok) throw new Error('setup');

    const uploadResult = await new UploadAttachment(repo, storage, idGen).execute(
      createResult.value.transferId, fn.value, fs.value, Readable.from(Buffer.from('hello world')),
    );
    if (!uploadResult.ok) throw new Error('setup');
    attachmentId = uploadResult.value.id;

    await new FinalizeTransfer(repo).execute(createResult.value.transferId);
    downloadUseCase = new DownloadAttachment(repo, storage);
  });

  it('returns the file stream', async () => {
    const result = await downloadUseCase.execute(shareLink, attachmentId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const content = await streamToString(result.value.stream);
    expect(content).toBe('hello world');
    expect(result.value.fileName.value).toBe('doc.txt');
    expect(result.value.fileSize.bytes).toBe(11);
  });

  it('rejects unknown shareLink', async () => {
    const unknown = ShareLink.create('XXXXXXXXXXXXXXXXXXXXZ');
    if (!unknown.ok) throw new Error('setup');
    const result = await downloadUseCase.execute(unknown.value, attachmentId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error._tag).toBe('TransferNotFound');
  });

  it('rejects unknown attachmentId', async () => {
    const result = await downloadUseCase.execute(shareLink, 'no-such-id');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error._tag).toBe('AttachmentNotFound');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/application/DownloadAttachment.test.ts
```

- [ ] **Step 3: Implement**

`packages/backend/src/application/DownloadAttachment.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';
import type { Readable } from 'node:stream';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { FileStorage } from '../domain/port/FileStorage.js';
import type { ShareLink } from '../domain/model/ShareLink.js';
import type { FileName } from '../domain/model/FileName.js';
import type { FileSize } from '../domain/model/FileSize.js';
import { TransferNotFound, TransferNotDownloadable, AttachmentNotFound } from './errors.js';

export type DownloadAttachmentError = TransferNotFound | TransferNotDownloadable | AttachmentNotFound;

export class DownloadAttachment {
  constructor(
    private readonly repo: TransferRepository,
    private readonly storage: FileStorage,
  ) {}

  async execute(
    shareLink: ShareLink,
    attachmentId: string,
  ): Promise<Result<{ stream: Readable; fileName: FileName; fileSize: FileSize }, DownloadAttachmentError>> {
    const transfer = await this.repo.findByShareLink(shareLink);
    if (!transfer) return err(new TransferNotFound());
    if (!transfer.isDownloadable()) return err(new TransferNotDownloadable());

    const attachment = transfer.attachments.find((a) => a.id === attachmentId);
    if (!attachment) return err(new AttachmentNotFound());

    const stream = await this.storage.retrieve(attachment.storageKey);
    return ok({ stream, fileName: attachment.fileName, fileSize: attachment.fileSize });
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/application/DownloadAttachment.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/application/DownloadAttachment*
git commit -m "feat(backend): add DownloadAttachment use case"
```

---

### Task 7: DownloadTransfer Use Case (ZIP Streaming)

**Files:**
- Create: `packages/backend/src/application/DownloadTransfer.ts`
- Create: `packages/backend/src/application/DownloadTransfer.test.ts`

**Interfaces:**
- Consumes: `TransferRepository`, `FileStorage`, `ArchiveCreator`, `ShareLink`
- Produces: `DownloadTransfer.execute(shareLink): Promise<Result<{ stream: Readable }, DownloadTransferError>>`

- [ ] **Step 1: Write failing test**

`packages/backend/src/application/DownloadTransfer.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Readable } from 'node:stream';
import { DownloadTransfer } from './DownloadTransfer.js';
import { CreateTransfer } from './CreateTransfer.js';
import { UploadAttachment } from './UploadAttachment.js';
import { FinalizeTransfer } from './FinalizeTransfer.js';
import { InMemoryTransferRepository } from './fakes/InMemoryTransferRepository.js';
import { InMemoryFileStorage } from './fakes/InMemoryFileStorage.js';
import { StubIdGenerator } from './fakes/StubIdGenerator.js';
import { FakeArchiveCreator } from './fakes/FakeArchiveCreator.js';
import { FileName } from '../domain/model/FileName.js';
import { FileSize } from '../domain/model/FileSize.js';
import { ShareLink } from '../domain/model/ShareLink.js';

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf-8');
}

describe('DownloadTransfer', () => {
  let repo: InMemoryTransferRepository;
  let storage: InMemoryFileStorage;
  let idGen: StubIdGenerator;
  let archiveCreator: FakeArchiveCreator;
  let downloadUseCase: DownloadTransfer;
  let shareLink: ShareLink;

  beforeEach(async () => {
    repo = new InMemoryTransferRepository();
    storage = new InMemoryFileStorage();
    idGen = new StubIdGenerator();
    archiveCreator = new FakeArchiveCreator();

    const createResult = await new CreateTransfer(repo, idGen, 7, 10_000_000).execute();
    if (!createResult.ok) throw new Error('setup');
    shareLink = createResult.value.shareLink;
    const transferId = createResult.value.transferId;

    const fn1 = FileName.create('a.txt');
    const fs1 = FileSize.create(2);
    if (!fn1.ok || !fs1.ok) throw new Error('setup');
    await new UploadAttachment(repo, storage, idGen).execute(
      transferId, fn1.value, fs1.value, Readable.from(Buffer.from('AA')),
    );

    const fn2 = FileName.create('b.txt');
    const fs2 = FileSize.create(2);
    if (!fn2.ok || !fs2.ok) throw new Error('setup');
    await new UploadAttachment(repo, storage, idGen).execute(
      transferId, fn2.value, fs2.value, Readable.from(Buffer.from('BB')),
    );

    await new FinalizeTransfer(repo).execute(transferId);
    downloadUseCase = new DownloadTransfer(repo, storage, archiveCreator);
  });

  it('returns a readable stream with all files', async () => {
    const result = await downloadUseCase.execute(shareLink);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const content = await streamToString(result.value.stream);
    expect(content).toContain('a.txt');
    expect(content).toContain('AA');
    expect(content).toContain('b.txt');
    expect(content).toContain('BB');
  });

  it('rejects unknown shareLink', async () => {
    const unknown = ShareLink.create('XXXXXXXXXXXXXXXXXXXXZ');
    if (!unknown.ok) throw new Error('setup');
    const result = await downloadUseCase.execute(unknown.value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error._tag).toBe('TransferNotFound');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/application/DownloadTransfer.test.ts
```

- [ ] **Step 3: Implement**

`packages/backend/src/application/DownloadTransfer.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';
import type { Readable } from 'node:stream';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { FileStorage } from '../domain/port/FileStorage.js';
import type { ArchiveCreator } from '../domain/port/ArchiveCreator.js';
import type { ShareLink } from '../domain/model/ShareLink.js';
import { TransferNotFound, TransferNotDownloadable } from './errors.js';

export type DownloadTransferError = TransferNotFound | TransferNotDownloadable;

export class DownloadTransfer {
  constructor(
    private readonly repo: TransferRepository,
    private readonly storage: FileStorage,
    private readonly archiveCreator: ArchiveCreator,
  ) {}

  async execute(
    shareLink: ShareLink,
  ): Promise<Result<{ stream: Readable }, DownloadTransferError>> {
    const transfer = await this.repo.findByShareLink(shareLink);
    if (!transfer) return err(new TransferNotFound());
    if (!transfer.isDownloadable()) return err(new TransferNotDownloadable());

    const entries = await Promise.all(
      transfer.attachments.map(async (attachment) => ({
        name: attachment.fileName.value,
        stream: await this.storage.retrieve(attachment.storageKey),
      })),
    );

    const zipStream = this.archiveCreator.createZip(entries);
    return ok({ stream: zipStream });
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/application/DownloadTransfer.test.ts
```

Expected: all PASS

- [ ] **Step 5: Run all backend tests**

```bash
cd packages/backend && pnpm test
```

Expected: all domain + application tests PASS

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/application/DownloadTransfer*
git commit -m "feat(backend): add DownloadTransfer use case with ZIP streaming via ArchiveCreator port"
```
