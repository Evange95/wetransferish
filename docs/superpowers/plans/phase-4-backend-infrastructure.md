# Phase 4: Backend Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all infrastructure adapters (Postgres, MinIO, Fastify routes), wire the DI container, and run E2E tests.

**Architecture:** Infrastructure layer implements domain ports. Fastify routes parse raw input into domain types at the boundary (parse don't validate). Streaming is end-to-end — no buffering.

**Tech Stack:** Fastify 5, pg (node-postgres), minio SDK, archiver, nanoid, Testcontainers for integration tests

## Global Constraints

- TypeScript strict mode
- Parse at boundary: route handlers parse params/body into domain value objects, return 400 on failure
- Streaming: never buffer entire files in memory
- TDD for adapters with Testcontainers
- Commit after each task

---

### Task 1: Install Backend Dependencies & Simple Adapters

**Files:**
- Modify: `packages/backend/package.json` — add runtime and dev dependencies
- Create: `packages/backend/src/infrastructure/id/NanoIdGenerator.ts`
- Create: `packages/backend/src/infrastructure/id/NanoIdGenerator.test.ts`
- Create: `packages/backend/src/infrastructure/archive/ArchiverZipCreator.ts`
- Create: `packages/backend/src/infrastructure/archive/ArchiverZipCreator.test.ts`

**Interfaces:**
- Consumes: `IdGenerator`, `ArchiveCreator` ports
- Produces:
  - `NanoIdGenerator` implements `IdGenerator`
  - `ArchiverZipCreator` implements `ArchiveCreator`

- [ ] **Step 1: Add dependencies**

```bash
cd packages/backend && pnpm add fastify @fastify/multipart minio pg nanoid archiver
cd packages/backend && pnpm add -D @types/pg @types/archiver testcontainers
```

- [ ] **Step 2: Write NanoIdGenerator failing test**

`packages/backend/src/infrastructure/id/NanoIdGenerator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { NanoIdGenerator } from './NanoIdGenerator.js';
import { ShareLink } from '../../domain/model/ShareLink.js';

describe('NanoIdGenerator', () => {
  const gen = new NanoIdGenerator();

  it('generates unique IDs', () => {
    const a = gen.generateId();
    const b = gen.generateId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('generates valid ShareLinks', () => {
    const link = gen.generateShareLink();
    expect(link).toBeInstanceOf(ShareLink);
    expect(link.value).toHaveLength(21);
  });

  it('generates unique ShareLinks', () => {
    const a = gen.generateShareLink();
    const b = gen.generateShareLink();
    expect(a.equals(b)).toBe(false);
  });
});
```

- [ ] **Step 3: Implement NanoIdGenerator**

`packages/backend/src/infrastructure/id/NanoIdGenerator.ts`:
```typescript
import { nanoid } from 'nanoid';
import type { IdGenerator } from '../../domain/port/IdGenerator.js';
import { ShareLink } from '../../domain/model/ShareLink.js';

export class NanoIdGenerator implements IdGenerator {
  generateId(): string {
    return nanoid();
  }

  generateShareLink(): ShareLink {
    const raw = nanoid(21);
    const result = ShareLink.create(raw);
    if (!result.ok) throw new Error(`nanoid produced invalid ShareLink: ${raw}`);
    return result.value;
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/infrastructure/id/NanoIdGenerator.test.ts
```

Expected: all PASS

- [ ] **Step 5: Write ArchiverZipCreator failing test**

`packages/backend/src/infrastructure/archive/ArchiverZipCreator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { createUnzip } from 'node:zlib';
import { ArchiverZipCreator } from './ArchiverZipCreator.js';

async function collectStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe('ArchiverZipCreator', () => {
  const creator = new ArchiverZipCreator();

  it('produces a valid ZIP stream with entries', async () => {
    const entries = [
      { name: 'hello.txt', stream: Readable.from(Buffer.from('hello')) },
      { name: 'world.txt', stream: Readable.from(Buffer.from('world')) },
    ];

    const zipStream = creator.createZip(entries);
    const zipBuffer = await collectStream(zipStream);

    // ZIP magic bytes: PK\x03\x04
    expect(zipBuffer[0]).toBe(0x50);
    expect(zipBuffer[1]).toBe(0x4b);
    expect(zipBuffer.length).toBeGreaterThan(0);
  });

  it('produces a stream for empty entries', async () => {
    const zipStream = creator.createZip([]);
    const zipBuffer = await collectStream(zipStream);
    expect(zipBuffer.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Implement ArchiverZipCreator**

`packages/backend/src/infrastructure/archive/ArchiverZipCreator.ts`:
```typescript
import archiver from 'archiver';
import type { Readable } from 'node:stream';
import type { ArchiveCreator, ArchiveEntry } from '../../domain/port/ArchiveCreator.js';

export class ArchiverZipCreator implements ArchiveCreator {
  createZip(entries: ArchiveEntry[]): Readable {
    const archive = archiver('zip', { store: true });
    for (const entry of entries) {
      archive.append(entry.stream, { name: entry.name });
    }
    archive.finalize();
    return archive;
  }
}
```

- [ ] **Step 7: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/infrastructure/archive/ArchiverZipCreator.test.ts
```

Expected: all PASS

- [ ] **Step 8: Commit**

```bash
git add packages/backend/
git commit -m "feat(backend): add NanoIdGenerator and ArchiverZipCreator adapters"
```

---

### Task 2: PostgresTransferRepository

**Files:**
- Create: `packages/backend/src/infrastructure/persistence/PostgresTransferRepository.ts`
- Create: `packages/backend/src/infrastructure/persistence/PostgresTransferRepository.integration.test.ts`
- Create: `packages/backend/src/infrastructure/persistence/schema.sql`

**Interfaces:**
- Consumes: `TransferRepository` port, `pg.Pool`
- Produces: `PostgresTransferRepository` implements `TransferRepository`, `schema.sql` for table creation

- [ ] **Step 1: Create SQL schema**

`packages/backend/src/infrastructure/persistence/schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  share_link TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'collecting',
  expires_at TIMESTAMPTZ NOT NULL,
  max_total_size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_transfer_id ON attachments(transfer_id);
```

- [ ] **Step 2: Write integration test**

`packages/backend/src/infrastructure/persistence/PostgresTransferRepository.integration.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { PostgresTransferRepository } from './PostgresTransferRepository.js';
import { Transfer } from '../../domain/model/Transfer.js';
import { Attachment } from '../../domain/model/Attachment.js';
import { ShareLink } from '../../domain/model/ShareLink.js';
import { Expiry } from '../../domain/model/Expiry.js';
import { FileName } from '../../domain/model/FileName.js';
import { FileSize } from '../../domain/model/FileSize.js';
import { StorageKey } from '../../domain/model/StorageKey.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeTransfer(id: string, shareLinkStr: string): Transfer {
  const sl = ShareLink.create(shareLinkStr);
  const exp = Expiry.fromNow(7);
  if (!sl.ok || !exp.ok) throw new Error('setup');
  return Transfer.create(id, sl.value, exp.value, 10_000_000);
}

function makeAttachment(id: string): Attachment {
  const fn = FileName.create('test.txt');
  const fs = FileSize.create(100);
  const sk = StorageKey.create(`t/${id}`);
  if (!fn.ok || !fs.ok || !sk.ok) throw new Error('setup');
  return new Attachment(id, fn.value, fs.value, sk.value);
}

describe('PostgresTransferRepository', () => {
  let container: StartedTestContainer;
  let pool: pg.Pool;
  let repo: PostgresTransferRepository;

  beforeAll(async () => {
    container = await new GenericContainer('postgres:16-alpine')
      .withEnvironment({ POSTGRES_DB: 'test', POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test' })
      .withExposedPorts(5432)
      .start();

    pool = new pg.Pool({
      host: container.getHost(),
      port: container.getMappedPort(5432),
      database: 'test',
      user: 'test',
      password: 'test',
    });

    const schema = readFileSync(resolve(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schema);

    repo = new PostgresTransferRepository(pool);
  }, 60_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM attachments');
    await pool.query('DELETE FROM transfers');
  });

  it('saves and retrieves a transfer by id', async () => {
    const transfer = makeTransfer('t1', 'V1StGXR8_Z5jdHi6B-myT');
    transfer.addAttachment(makeAttachment('a1'));
    await repo.save(transfer);

    const found = await repo.findById('t1');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('t1');
    expect(found!.attachments).toHaveLength(1);
    expect(found!.attachments[0].fileName.value).toBe('test.txt');
  });

  it('retrieves by shareLink', async () => {
    const transfer = makeTransfer('t2', 'AbCdEfGhIjKlMnOpQrStU');
    await repo.save(transfer);

    const sl = ShareLink.create('AbCdEfGhIjKlMnOpQrStU');
    if (!sl.ok) throw new Error('setup');
    const found = await repo.findByShareLink(sl.value);
    expect(found).not.toBeNull();
    expect(found!.id).toBe('t2');
  });

  it('returns null for unknown id', async () => {
    expect(await repo.findById('nope')).toBeNull();
  });

  it('returns null for unknown shareLink', async () => {
    const sl = ShareLink.create('XXXXXXXXXXXXXXXXXXXXZ');
    if (!sl.ok) throw new Error('setup');
    expect(await repo.findByShareLink(sl.value)).toBeNull();
  });

  it('updates transfer on re-save', async () => {
    const transfer = makeTransfer('t3', 'UpdateTestLinkXXXXXXX');
    await repo.save(transfer);
    transfer.addAttachment(makeAttachment('a2'));
    transfer.finalize();
    await repo.save(transfer);

    const found = await repo.findById('t3');
    expect(found!.status).toBe('ready');
    expect(found!.attachments).toHaveLength(1);
  });
}, 120_000);
```

- [ ] **Step 3: Implement PostgresTransferRepository**

`packages/backend/src/infrastructure/persistence/PostgresTransferRepository.ts`:
```typescript
import type pg from 'pg';
import type { TransferRepository } from '../../domain/port/TransferRepository.js';
import { Transfer, type TransferStatus } from '../../domain/model/Transfer.js';
import { Attachment } from '../../domain/model/Attachment.js';
import { ShareLink } from '../../domain/model/ShareLink.js';
import { Expiry } from '../../domain/model/Expiry.js';
import { FileName } from '../../domain/model/FileName.js';
import { FileSize } from '../../domain/model/FileSize.js';
import { StorageKey } from '../../domain/model/StorageKey.js';

export class PostgresTransferRepository implements TransferRepository {
  constructor(private readonly pool: pg.Pool) {}

  async save(transfer: Transfer): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO transfers (id, share_link, status, expires_at, max_total_size_bytes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET status = $3`,
        [transfer.id, transfer.shareLink.value, transfer.status, transfer.expiry.date, transfer.maxTotalSizeBytes],
      );

      await client.query('DELETE FROM attachments WHERE transfer_id = $1', [transfer.id]);

      for (const att of transfer.attachments) {
        await client.query(
          `INSERT INTO attachments (id, transfer_id, file_name, file_size_bytes, storage_key)
           VALUES ($1, $2, $3, $4, $5)`,
          [att.id, transfer.id, att.fileName.value, att.fileSize.bytes, att.storageKey.value],
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Transfer | null> {
    const transferResult = await this.pool.query('SELECT * FROM transfers WHERE id = $1', [id]);
    if (transferResult.rows.length === 0) return null;

    const attachmentResult = await this.pool.query(
      'SELECT * FROM attachments WHERE transfer_id = $1 ORDER BY created_at',
      [id],
    );

    return this.reconstruct(transferResult.rows[0], attachmentResult.rows);
  }

  async findByShareLink(shareLink: ShareLink): Promise<Transfer | null> {
    const transferResult = await this.pool.query('SELECT * FROM transfers WHERE share_link = $1', [shareLink.value]);
    if (transferResult.rows.length === 0) return null;

    const row = transferResult.rows[0];
    const attachmentResult = await this.pool.query(
      'SELECT * FROM attachments WHERE transfer_id = $1 ORDER BY created_at',
      [row.id],
    );

    return this.reconstruct(row, attachmentResult.rows);
  }

  private reconstruct(row: Record<string, unknown>, attRows: Record<string, unknown>[]): Transfer {
    const shareLink = ShareLink.create(row.share_link as string);
    const expiry = Expiry.create(new Date(row.expires_at as string));
    if (!shareLink.ok) throw new Error(`Corrupt DB: invalid share_link "${row.share_link}"`);
    if (!expiry.ok) throw new Error(`Corrupt DB: invalid expires_at "${row.expires_at}"`);

    const attachments = attRows.map((ar) => {
      const fn = FileName.create(ar.file_name as string);
      const fs = FileSize.create(Number(ar.file_size_bytes));
      const sk = StorageKey.create(ar.storage_key as string);
      if (!fn.ok) throw new Error(`Corrupt DB: invalid file_name "${ar.file_name}"`);
      if (!fs.ok) throw new Error(`Corrupt DB: invalid file_size_bytes "${ar.file_size_bytes}"`);
      if (!sk.ok) throw new Error(`Corrupt DB: invalid storage_key "${ar.storage_key}"`);
      return new Attachment(ar.id as string, fn.value, fs.value, sk.value);
    });

    return Transfer.reconstitute(
      row.id as string,
      shareLink.value,
      expiry.value,
      Number(row.max_total_size_bytes),
      row.status as TransferStatus,
      attachments,
    );
  }
}
```

- [ ] **Step 4: Run integration test**

```bash
cd packages/backend && pnpm test -- src/infrastructure/persistence/PostgresTransferRepository.integration.test.ts
```

Expected: all PASS (requires Docker running for Testcontainers)

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/infrastructure/persistence/
git commit -m "feat(backend): add PostgresTransferRepository with integration tests"
```

---

### Task 3: MinioFileStorage

**Files:**
- Create: `packages/backend/src/infrastructure/storage/MinioFileStorage.ts`
- Create: `packages/backend/src/infrastructure/storage/MinioFileStorage.integration.test.ts`

**Interfaces:**
- Consumes: `FileStorage` port, `minio.Client`
- Produces: `MinioFileStorage` implements `FileStorage`

- [ ] **Step 1: Write integration test**

`packages/backend/src/infrastructure/storage/MinioFileStorage.integration.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Readable } from 'node:stream';
import { Client as MinioClient } from 'minio';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { MinioFileStorage } from './MinioFileStorage.js';
import { StorageKey } from '../../domain/model/StorageKey.js';
import { FileSize } from '../../domain/model/FileSize.js';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe('MinioFileStorage', () => {
  let container: StartedTestContainer;
  let storage: MinioFileStorage;
  const BUCKET = 'test-bucket';

  beforeAll(async () => {
    container = await new GenericContainer('minio/minio')
      .withCommand(['server', '/data'])
      .withEnvironment({ MINIO_ROOT_USER: 'minioadmin', MINIO_ROOT_PASSWORD: 'minioadmin' })
      .withExposedPorts(9000)
      .start();

    const client = new MinioClient({
      endPoint: container.getHost(),
      port: container.getMappedPort(9000),
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
    });

    const exists = await client.bucketExists(BUCKET);
    if (!exists) await client.makeBucket(BUCKET);

    storage = new MinioFileStorage(client, BUCKET);
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  it('stores and retrieves a file via streaming', async () => {
    const key = StorageKey.create('test/file1.txt');
    const size = FileSize.create(11);
    if (!key.ok || !size.ok) throw new Error('setup');

    const input = Readable.from(Buffer.from('hello world'));
    await storage.store(key.value, input, size.value);

    const output = await storage.retrieve(key.value);
    const data = await streamToBuffer(output);
    expect(data.toString('utf-8')).toBe('hello world');
  });

  it('handles binary data', async () => {
    const key = StorageKey.create('test/binary.bin');
    const binaryData = Buffer.from([0x00, 0xff, 0x42, 0xde, 0xad]);
    const size = FileSize.create(binaryData.length);
    if (!key.ok || !size.ok) throw new Error('setup');

    await storage.store(key.value, Readable.from(binaryData), size.value);

    const output = await storage.retrieve(key.value);
    const data = await streamToBuffer(output);
    expect(data).toEqual(binaryData);
  });
}, 120_000);
```

- [ ] **Step 2: Implement MinioFileStorage**

`packages/backend/src/infrastructure/storage/MinioFileStorage.ts`:
```typescript
import type { Readable } from 'node:stream';
import type { Client as MinioClient } from 'minio';
import type { FileStorage } from '../../domain/port/FileStorage.js';
import type { StorageKey } from '../../domain/model/StorageKey.js';
import type { FileSize } from '../../domain/model/FileSize.js';

export class MinioFileStorage implements FileStorage {
  constructor(
    private readonly client: MinioClient,
    private readonly bucket: string,
  ) {}

  async store(key: StorageKey, stream: Readable, size: FileSize): Promise<void> {
    await this.client.putObject(this.bucket, key.value, stream, size.bytes);
  }

  async retrieve(key: StorageKey): Promise<Readable> {
    return await this.client.getObject(this.bucket, key.value);
  }
}
```

- [ ] **Step 3: Run integration test**

```bash
cd packages/backend && pnpm test -- src/infrastructure/storage/MinioFileStorage.integration.test.ts
```

Expected: all PASS

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/infrastructure/storage/
git commit -m "feat(backend): add MinioFileStorage with integration tests"
```

---

### Task 4: Fastify Server & Upload Routes

**Files:**
- Create: `packages/backend/src/infrastructure/http/FastifyServer.ts`
- Create: `packages/backend/src/infrastructure/http/routes/uploadRoutes.ts`

**Interfaces:**
- Consumes: `CreateTransfer`, `UploadAttachment`, `FinalizeTransfer` use cases, `FileName`, `FileSize` parsers
- Produces: Fastify server with `POST /api/transfers`, `POST /api/transfers/:transferId/attachments`, `POST /api/transfers/:transferId/finalize`

- [ ] **Step 1: Create FastifyServer**

`packages/backend/src/infrastructure/http/FastifyServer.ts`:
```typescript
import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(multipart, {
    limits: { fileSize: 2_000_000_000 },
  });
  return app;
}
```

- [ ] **Step 2: Create upload routes**

`packages/backend/src/infrastructure/http/routes/uploadRoutes.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import type { CreateTransfer } from '../../../application/CreateTransfer.js';
import type { UploadAttachment } from '../../../application/UploadAttachment.js';
import type { FinalizeTransfer } from '../../../application/FinalizeTransfer.js';
import { FileName } from '../../../domain/model/FileName.js';
import { FileSize } from '../../../domain/model/FileSize.js';
import type {
  CreateTransferResponse,
  UploadAttachmentResponse,
  FinalizeTransferResponse,
} from '@wetransferish/shared';

export interface UploadRouteDeps {
  createTransfer: CreateTransfer;
  uploadAttachment: UploadAttachment;
  finalizeTransfer: FinalizeTransfer;
}

export async function uploadRoutes(app: FastifyInstance, deps: UploadRouteDeps): Promise<void> {
  app.post<{ Reply: CreateTransferResponse }>('/api/transfers', async (_req, reply) => {
    const result = await deps.createTransfer.execute();
    if (!result.ok) {
      return reply.status(500).send({ error: result.error.message });
    }
    return reply.status(201).send({
      transferId: result.value.transferId,
      shareLink: result.value.shareLink.value,
    });
  });

  app.post<{ Params: { transferId: string }; Reply: UploadAttachmentResponse }>(
    '/api/transfers/:transferId/attachments',
    async (req, reply) => {
      const file = await req.file();
      if (!file) return reply.status(400).send({ error: 'No file provided' });

      const fileNameResult = FileName.create(file.filename);
      if (!fileNameResult.ok) return reply.status(400).send({ error: fileNameResult.error.message });

      const fileSizeHeader = req.headers['content-length'];
      const sizeValue = fileSizeHeader ? Number(fileSizeHeader) : 0;
      const fileSizeResult = FileSize.create(sizeValue);
      if (!fileSizeResult.ok) return reply.status(400).send({ error: fileSizeResult.error.message });

      const result = await deps.uploadAttachment.execute(
        req.params.transferId,
        fileNameResult.value,
        fileSizeResult.value,
        file.file,
      );

      if (!result.ok) {
        const status = result.error._tag === 'TransferNotFound' ? 404 : 400;
        return reply.status(status).send({ error: result.error.message });
      }

      return reply.status(201).send({
        attachmentId: result.value.id,
        fileName: result.value.fileName.value,
        fileSize: result.value.fileSize.bytes,
      });
    },
  );

  app.post<{ Params: { transferId: string }; Reply: FinalizeTransferResponse }>(
    '/api/transfers/:transferId/finalize',
    async (req, reply) => {
      const result = await deps.finalizeTransfer.execute(req.params.transferId);
      if (!result.ok) {
        const status = result.error._tag === 'TransferNotFound' ? 404 : 400;
        return reply.status(status).send({ error: result.error.message });
      }
      return reply.status(200).send({
        shareLink: result.value.shareLink.value,
        expiresAt: result.value.expiresAt.toISOString(),
      });
    },
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/backend/src/infrastructure/http/
git commit -m "feat(backend): add Fastify server and upload routes"
```

---

### Task 5: Download Routes

**Files:**
- Create: `packages/backend/src/infrastructure/http/routes/downloadRoutes.ts`

**Interfaces:**
- Consumes: `GetTransferInfo`, `DownloadAttachment`, `DownloadTransfer` use cases, `ShareLink` parser
- Produces: `GET /api/transfers/:shareLink`, `GET /api/transfers/:shareLink/download`, `GET /api/transfers/:shareLink/attachments/:attachmentId/download`

- [ ] **Step 1: Create download routes**

`packages/backend/src/infrastructure/http/routes/downloadRoutes.ts`:
```typescript
import type { FastifyInstance } from 'fastify';
import type { GetTransferInfo } from '../../../application/GetTransferInfo.js';
import type { DownloadAttachment } from '../../../application/DownloadAttachment.js';
import type { DownloadTransfer } from '../../../application/DownloadTransfer.js';
import { ShareLink } from '../../../domain/model/ShareLink.js';
import type { TransferInfoResponse } from '@wetransferish/shared';

export interface DownloadRouteDeps {
  getTransferInfo: GetTransferInfo;
  downloadAttachment: DownloadAttachment;
  downloadTransfer: DownloadTransfer;
}

export async function downloadRoutes(app: FastifyInstance, deps: DownloadRouteDeps): Promise<void> {
  app.get<{ Params: { shareLink: string }; Reply: TransferInfoResponse }>(
    '/api/transfers/:shareLink',
    async (req, reply) => {
      const shareLinkResult = ShareLink.create(req.params.shareLink);
      if (!shareLinkResult.ok) return reply.status(400).send({ error: shareLinkResult.error.message });

      const result = await deps.getTransferInfo.execute(shareLinkResult.value);
      if (!result.ok) return reply.status(404).send({ error: result.error.message });

      return reply.status(200).send({
        totalSize: result.value.totalSize,
        attachments: result.value.attachments.map((a) => ({ id: a.id, name: a.name, size: a.size })),
        expiresAt: result.value.expiresAt.toISOString(),
        expired: result.value.expired,
      });
    },
  );

  app.get<{ Params: { shareLink: string } }>(
    '/api/transfers/:shareLink/download',
    async (req, reply) => {
      const shareLinkResult = ShareLink.create(req.params.shareLink);
      if (!shareLinkResult.ok) return reply.status(400).send({ error: shareLinkResult.error.message });

      const result = await deps.downloadTransfer.execute(shareLinkResult.value);
      if (!result.ok) {
        const status = result.error._tag === 'TransferNotFound' ? 404 : 410;
        return reply.status(status).send({ error: result.error.message });
      }

      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', 'attachment; filename="transfer.zip"')
        .header('Transfer-Encoding', 'chunked')
        .send(result.value.stream);
    },
  );

  app.get<{ Params: { shareLink: string; attachmentId: string } }>(
    '/api/transfers/:shareLink/attachments/:attachmentId/download',
    async (req, reply) => {
      const shareLinkResult = ShareLink.create(req.params.shareLink);
      if (!shareLinkResult.ok) return reply.status(400).send({ error: shareLinkResult.error.message });

      const result = await deps.downloadAttachment.execute(shareLinkResult.value, req.params.attachmentId);
      if (!result.ok) {
        const status = result.error._tag === 'TransferNotFound' ? 404
          : result.error._tag === 'AttachmentNotFound' ? 404
          : 410;
        return reply.status(status).send({ error: result.error.message });
      }

      return reply
        .header('Content-Type', 'application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${result.value.fileName.value}"`)
        .header('Content-Length', result.value.fileSize.bytes)
        .send(result.value.stream);
    },
  );
}
```

- [ ] **Step 2: Verify compilation**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/backend/src/infrastructure/http/routes/downloadRoutes.ts
git commit -m "feat(backend): add download routes with streaming ZIP and single-file"
```

---

### Task 6: DI Container & Main Entry Point

**Files:**
- Create: `packages/backend/src/config/container.ts`
- Create: `packages/backend/src/config/env.ts`
- Create: `packages/backend/src/main.ts`

**Interfaces:**
- Consumes: all adapters and use cases
- Produces: wired Fastify app, `main.ts` entry point

- [ ] **Step 1: Create env config**

`packages/backend/src/config/env.ts`:
```typescript
export interface AppConfig {
  port: number;
  host: string;
  postgres: { connectionString: string };
  minio: { endPoint: string; port: number; accessKey: string; secretKey: string; bucket: string; useSSL: boolean };
  transfer: { defaultExpiryDays: number; maxTotalSizeBytes: number };
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env['PORT'] ?? 3000),
    host: process.env['HOST'] ?? '0.0.0.0',
    postgres: {
      connectionString: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/wetransferish',
    },
    minio: {
      endPoint: process.env['MINIO_ENDPOINT'] ?? 'localhost',
      port: Number(process.env['MINIO_PORT'] ?? 9000),
      accessKey: process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
      secretKey: process.env['MINIO_SECRET_KEY'] ?? 'minioadmin',
      bucket: process.env['MINIO_BUCKET'] ?? 'transfers',
      useSSL: process.env['MINIO_USE_SSL'] === 'true',
    },
    transfer: {
      defaultExpiryDays: Number(process.env['TRANSFER_EXPIRY_DAYS'] ?? 7),
      maxTotalSizeBytes: Number(process.env['TRANSFER_MAX_SIZE_BYTES'] ?? 2_000_000_000),
    },
  };
}
```

- [ ] **Step 2: Create DI container**

`packages/backend/src/config/container.ts`:
```typescript
import pg from 'pg';
import { Client as MinioClient } from 'minio';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from './env.js';
import { createServer } from '../infrastructure/http/FastifyServer.js';
import { uploadRoutes } from '../infrastructure/http/routes/uploadRoutes.js';
import { downloadRoutes } from '../infrastructure/http/routes/downloadRoutes.js';
import { PostgresTransferRepository } from '../infrastructure/persistence/PostgresTransferRepository.js';
import { MinioFileStorage } from '../infrastructure/storage/MinioFileStorage.js';
import { NanoIdGenerator } from '../infrastructure/id/NanoIdGenerator.js';
import { ArchiverZipCreator } from '../infrastructure/archive/ArchiverZipCreator.js';
import { CreateTransfer } from '../application/CreateTransfer.js';
import { UploadAttachment } from '../application/UploadAttachment.js';
import { FinalizeTransfer } from '../application/FinalizeTransfer.js';
import { GetTransferInfo } from '../application/GetTransferInfo.js';
import { DownloadAttachment } from '../application/DownloadAttachment.js';
import { DownloadTransfer } from '../application/DownloadTransfer.js';

export async function buildApp(config: AppConfig): Promise<{ app: FastifyInstance; pool: pg.Pool }> {
  const pool = new pg.Pool({ connectionString: config.postgres.connectionString });
  const minioClient = new MinioClient({
    endPoint: config.minio.endPoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });

  const bucketExists = await minioClient.bucketExists(config.minio.bucket);
  if (!bucketExists) await minioClient.makeBucket(config.minio.bucket);

  const repo = new PostgresTransferRepository(pool);
  const storage = new MinioFileStorage(minioClient, config.minio.bucket);
  const idGen = new NanoIdGenerator();
  const archiver = new ArchiverZipCreator();

  const createTransfer = new CreateTransfer(repo, idGen, config.transfer.defaultExpiryDays, config.transfer.maxTotalSizeBytes);
  const uploadAttachment = new UploadAttachment(repo, storage, idGen);
  const finalizeTransfer = new FinalizeTransfer(repo);
  const getTransferInfo = new GetTransferInfo(repo);
  const downloadAttachment = new DownloadAttachment(repo, storage);
  const downloadTransfer = new DownloadTransfer(repo, storage, archiver);

  const app = await createServer();
  await app.register(async (instance) => uploadRoutes(instance, { createTransfer, uploadAttachment, finalizeTransfer }));
  await app.register(async (instance) => downloadRoutes(instance, { getTransferInfo, downloadAttachment, downloadTransfer }));

  return { app, pool };
}
```

- [ ] **Step 3: Create main entry point**

`packages/backend/src/main.ts`:
```typescript
import { loadConfig } from './config/env.js';
import { buildApp } from './config/container.js';

const config = loadConfig();
const { app } = await buildApp(config);

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/config/ packages/backend/src/main.ts
git commit -m "feat(backend): add DI container, env config, and main entry point"
```

---

### Task 7: E2E Route Tests

**Files:**
- Create: `packages/backend/src/infrastructure/http/routes/e2e.test.ts`

**Interfaces:**
- Consumes: `buildApp` or direct Fastify `inject()` with in-memory fakes
- Produces: E2E tests covering the full upload → finalize → info → download flow

- [ ] **Step 1: Write E2E test using in-memory fakes**

`packages/backend/src/infrastructure/http/routes/e2e.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import FormData from 'form-data';
import { Readable } from 'node:stream';
import { uploadRoutes } from './uploadRoutes.js';
import { downloadRoutes } from './downloadRoutes.js';
import { CreateTransfer } from '../../../application/CreateTransfer.js';
import { UploadAttachment } from '../../../application/UploadAttachment.js';
import { FinalizeTransfer } from '../../../application/FinalizeTransfer.js';
import { GetTransferInfo } from '../../../application/GetTransferInfo.js';
import { DownloadAttachment } from '../../../application/DownloadAttachment.js';
import { DownloadTransfer } from '../../../application/DownloadTransfer.js';
import { InMemoryTransferRepository } from '../../../application/fakes/InMemoryTransferRepository.js';
import { InMemoryFileStorage } from '../../../application/fakes/InMemoryFileStorage.js';
import { StubIdGenerator } from '../../../application/fakes/StubIdGenerator.js';
import { FakeArchiveCreator } from '../../../application/fakes/FakeArchiveCreator.js';

describe('E2E: upload → finalize → info → download', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    const repo = new InMemoryTransferRepository();
    const storage = new InMemoryFileStorage();
    const idGen = new StubIdGenerator();
    const archiver = new FakeArchiveCreator();

    const createTransfer = new CreateTransfer(repo, idGen, 7, 10_000_000);
    const uploadAttachment = new UploadAttachment(repo, storage, idGen);
    const finalizeTransfer = new FinalizeTransfer(repo);
    const getTransferInfo = new GetTransferInfo(repo);
    const downloadAttachment = new DownloadAttachment(repo, storage);
    const downloadTransfer = new DownloadTransfer(repo, storage, archiver);

    app = Fastify();
    await app.register(multipart, { limits: { fileSize: 10_000_000 } });
    await app.register(async (i) => uploadRoutes(i, { createTransfer, uploadAttachment, finalizeTransfer }));
    await app.register(async (i) => downloadRoutes(i, { getTransferInfo, downloadAttachment, downloadTransfer }));
    await app.ready();
  });

  it('full upload-download flow', async () => {
    // 1. Create transfer
    const createRes = await app.inject({ method: 'POST', url: '/api/transfers' });
    expect(createRes.statusCode).toBe(201);
    const { transferId, shareLink } = createRes.json();
    expect(transferId).toBeTruthy();
    expect(shareLink).toBeTruthy();

    // 2. Upload a file
    const form = new FormData();
    form.append('file', Buffer.from('test content'), { filename: 'test.txt', contentType: 'text/plain' });
    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/transfers/${transferId}/attachments`,
      payload: form,
      headers: form.getHeaders(),
    });
    expect(uploadRes.statusCode).toBe(201);
    const { attachmentId } = uploadRes.json();

    // 3. Finalize
    const finalizeRes = await app.inject({ method: 'POST', url: `/api/transfers/${transferId}/finalize` });
    expect(finalizeRes.statusCode).toBe(200);

    // 4. Get info
    const infoRes = await app.inject({ method: 'GET', url: `/api/transfers/${shareLink}` });
    expect(infoRes.statusCode).toBe(200);
    const info = infoRes.json();
    expect(info.attachments).toHaveLength(1);
    expect(info.expired).toBe(false);

    // 5. Download single file
    const downloadRes = await app.inject({
      method: 'GET',
      url: `/api/transfers/${shareLink}/attachments/${attachmentId}/download`,
    });
    expect(downloadRes.statusCode).toBe(200);
    expect(downloadRes.body).toBe('test content');

    // 6. Download ZIP
    const zipRes = await app.inject({ method: 'GET', url: `/api/transfers/${shareLink}/download` });
    expect(zipRes.statusCode).toBe(200);
    expect(zipRes.body).toContain('test.txt');
  });
});
```

- [ ] **Step 2: Add form-data dev dependency**

```bash
cd packages/backend && pnpm add -D form-data @types/form-data
```

- [ ] **Step 3: Run E2E test**

```bash
cd packages/backend && pnpm test -- src/infrastructure/http/routes/e2e.test.ts
```

Expected: all PASS

- [ ] **Step 4: Run all backend tests**

```bash
cd packages/backend && pnpm test
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/
git commit -m "feat(backend): add E2E route tests for full upload-download flow"
```
