# Phase 2: Backend Domain Model

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all value objects, entities, the Transfer aggregate, and port interfaces for the backend domain layer.

**Architecture:** Pure domain layer — zero external dependencies. All types use parse-don't-validate via `Result<T, E>`. The Transfer aggregate enforces all invariants.

**Tech Stack:** TypeScript 5.9, Vitest, `@wetransferish/shared` (Result type)

## Global Constraints

- TypeScript strict mode
- Parse don't validate: private constructors, static `create()` → `Result<T, E>`
- No thrown exceptions for domain logic
- No external dependencies in the domain layer
- TDD: Red → Green → Refactor
- Commit after each task

---

### Task 1: FileSize, FileName, StorageKey Value Objects

**Files:**
- Create: `packages/backend/src/domain/model/FileSize.ts`
- Create: `packages/backend/src/domain/model/FileSize.test.ts`
- Create: `packages/backend/src/domain/model/FileName.ts`
- Create: `packages/backend/src/domain/model/FileName.test.ts`
- Create: `packages/backend/src/domain/model/StorageKey.ts`
- Create: `packages/backend/src/domain/model/StorageKey.test.ts`

**Interfaces:**
- Consumes: `Result<T, E>`, `ok`, `err` from `@wetransferish/shared`
- Produces:
  - `FileSize.create(bytes: number): Result<FileSize, InvalidFileSize>`, `FileSize.bytes: number`, `FileSize.equals(other: FileSize): boolean`
  - `FileName.create(raw: string): Result<FileName, InvalidFileName>`, `FileName.value: string`, `FileName.equals(other: FileName): boolean`
  - `StorageKey.create(raw: string): Result<StorageKey, InvalidStorageKey>`, `StorageKey.value: string`, `StorageKey.equals(other: StorageKey): boolean`

- [ ] **Step 1: Write FileSize failing tests**

`packages/backend/src/domain/model/FileSize.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { FileSize } from './FileSize.js';

describe('FileSize', () => {
  it('parses a valid size', () => {
    const result = FileSize.create(1024);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.bytes).toBe(1024);
  });

  it('parses zero', () => {
    const result = FileSize.create(0);
    expect(result.ok).toBe(true);
  });

  it('rejects negative numbers', () => {
    const result = FileSize.create(-1);
    expect(result.ok).toBe(false);
  });

  it('rejects NaN', () => {
    const result = FileSize.create(NaN);
    expect(result.ok).toBe(false);
  });

  it('rejects non-integer', () => {
    const result = FileSize.create(1.5);
    expect(result.ok).toBe(false);
  });

  it('compares equality by value', () => {
    const a = FileSize.create(1024);
    const b = FileSize.create(1024);
    const c = FileSize.create(2048);
    if (a.ok && b.ok && c.ok) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(c.value)).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/domain/model/FileSize.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement FileSize**

`packages/backend/src/domain/model/FileSize.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidFileSize {
  readonly _tag = 'InvalidFileSize' as const;
  constructor(readonly message: string) {}
}

export class FileSize {
  private constructor(private readonly _bytes: number) {}

  static create(bytes: number): Result<FileSize, InvalidFileSize> {
    if (!Number.isFinite(bytes)) return err(new InvalidFileSize('Must be a finite number'));
    if (!Number.isInteger(bytes)) return err(new InvalidFileSize('Must be an integer'));
    if (bytes < 0) return err(new InvalidFileSize('Must not be negative'));
    return ok(new FileSize(bytes));
  }

  get bytes(): number {
    return this._bytes;
  }

  equals(other: FileSize): boolean {
    return this._bytes === other._bytes;
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/domain/model/FileSize.test.ts
```

Expected: all PASS

- [ ] **Step 5: Write FileName failing tests**

`packages/backend/src/domain/model/FileName.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { FileName } from './FileName.js';

describe('FileName', () => {
  it('parses a valid name', () => {
    const result = FileName.create('document.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe('document.pdf');
  });

  it('trims whitespace', () => {
    const result = FileName.create('  photo.jpg  ');
    if (result.ok) expect(result.value.value).toBe('photo.jpg');
  });

  it('sanitizes path separators', () => {
    const result = FileName.create('../../etc/passwd');
    if (result.ok) expect(result.value.value).toBe('.._.._etc_passwd');
  });

  it('sanitizes backslashes', () => {
    const result = FileName.create('folder\\file.txt');
    if (result.ok) expect(result.value.value).toBe('folder_file.txt');
  });

  it('rejects empty string', () => {
    expect(FileName.create('').ok).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(FileName.create('   ').ok).toBe(false);
  });

  it('rejects names longer than 255 chars', () => {
    expect(FileName.create('a'.repeat(256)).ok).toBe(false);
  });

  it('accepts name exactly 255 chars', () => {
    expect(FileName.create('a'.repeat(255)).ok).toBe(true);
  });

  it('compares equality by value', () => {
    const a = FileName.create('file.txt');
    const b = FileName.create('file.txt');
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});
```

- [ ] **Step 6: Implement FileName**

`packages/backend/src/domain/model/FileName.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidFileName {
  readonly _tag = 'InvalidFileName' as const;
  constructor(readonly message: string) {}
}

export class FileName {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Result<FileName, InvalidFileName> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return err(new InvalidFileName('Must not be empty'));
    if (trimmed.length > 255) return err(new InvalidFileName('Must not exceed 255 characters'));
    const sanitized = trimmed.replace(/[/\\]/g, '_');
    return ok(new FileName(sanitized));
  }

  get value(): string {
    return this._value;
  }

  equals(other: FileName): boolean {
    return this._value === other._value;
  }
}
```

- [ ] **Step 7: Run FileName tests, verify pass**

```bash
cd packages/backend && pnpm test -- src/domain/model/FileName.test.ts
```

Expected: all PASS

- [ ] **Step 8: Write StorageKey failing tests**

`packages/backend/src/domain/model/StorageKey.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { StorageKey } from './StorageKey.js';

describe('StorageKey', () => {
  it('parses a valid key', () => {
    const result = StorageKey.create('transfers/abc/file1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe('transfers/abc/file1');
  });

  it('rejects empty string', () => {
    expect(StorageKey.create('').ok).toBe(false);
  });

  it('compares equality by value', () => {
    const a = StorageKey.create('key-a');
    const b = StorageKey.create('key-a');
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});
```

- [ ] **Step 9: Implement StorageKey**

`packages/backend/src/domain/model/StorageKey.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidStorageKey {
  readonly _tag = 'InvalidStorageKey' as const;
  constructor(readonly message: string) {}
}

export class StorageKey {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Result<StorageKey, InvalidStorageKey> {
    if (raw.length === 0) return err(new InvalidStorageKey('Must not be empty'));
    return ok(new StorageKey(raw));
  }

  get value(): string {
    return this._value;
  }

  equals(other: StorageKey): boolean {
    return this._value === other._value;
  }
}
```

- [ ] **Step 10: Run all three VO tests**

```bash
cd packages/backend && pnpm test -- src/domain/model/
```

Expected: all PASS

- [ ] **Step 11: Commit**

```bash
git add packages/backend/src/domain/model/
git commit -m "feat(backend): add FileSize, FileName, StorageKey value objects"
```

---

### Task 2: ShareLink Value Object

**Files:**
- Create: `packages/backend/src/domain/model/ShareLink.ts`
- Create: `packages/backend/src/domain/model/ShareLink.test.ts`

**Interfaces:**
- Consumes: `Result<T, E>` from `@wetransferish/shared`
- Produces: `ShareLink.create(raw: string): Result<ShareLink, InvalidShareLink>`, `ShareLink.value: string`, `ShareLink.equals(other: ShareLink): boolean`

- [ ] **Step 1: Write failing tests**

`packages/backend/src/domain/model/ShareLink.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { ShareLink } from './ShareLink.js';

describe('ShareLink', () => {
  const VALID_LINK = 'V1StGXR8_Z5jdHi6B-myT';

  it('parses a valid 21-char URL-safe string', () => {
    const result = ShareLink.create(VALID_LINK);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe(VALID_LINK);
  });

  it('rejects empty string', () => {
    expect(ShareLink.create('').ok).toBe(false);
  });

  it('rejects too short', () => {
    expect(ShareLink.create('abc').ok).toBe(false);
  });

  it('rejects too long', () => {
    expect(ShareLink.create('a'.repeat(22)).ok).toBe(false);
  });

  it('rejects non-URL-safe characters', () => {
    expect(ShareLink.create('V1StGXR8!Z5jdHi6B-my').ok).toBe(false);
  });

  it('accepts underscores and hyphens', () => {
    expect(ShareLink.create('abc_def-ghi_jkl-mnopq').ok).toBe(true);
  });

  it('compares equality by value', () => {
    const a = ShareLink.create(VALID_LINK);
    const b = ShareLink.create(VALID_LINK);
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/domain/model/ShareLink.test.ts
```

- [ ] **Step 3: Implement ShareLink**

`packages/backend/src/domain/model/ShareLink.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidShareLink {
  readonly _tag = 'InvalidShareLink' as const;
  constructor(readonly message: string) {}
}

const SHARE_LINK_PATTERN = /^[A-Za-z0-9_-]{21}$/;

export class ShareLink {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Result<ShareLink, InvalidShareLink> {
    if (!SHARE_LINK_PATTERN.test(raw)) {
      return err(new InvalidShareLink('Must be exactly 21 URL-safe characters [A-Za-z0-9_-]'));
    }
    return ok(new ShareLink(raw));
  }

  get value(): string {
    return this._value;
  }

  equals(other: ShareLink): boolean {
    return this._value === other._value;
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/domain/model/ShareLink.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain/model/ShareLink*
git commit -m "feat(backend): add ShareLink value object"
```

---

### Task 3: Expiry Value Object

**Files:**
- Create: `packages/backend/src/domain/model/Expiry.ts`
- Create: `packages/backend/src/domain/model/Expiry.test.ts`

**Interfaces:**
- Consumes: `Result<T, E>` from `@wetransferish/shared`
- Produces:
  - `Expiry.create(date: Date): Result<Expiry, InvalidExpiry>`
  - `Expiry.fromNow(days: number, now?: Date): Result<Expiry, InvalidExpiry>`
  - `Expiry.isExpired(now?: Date): boolean`
  - `Expiry.date: Date` (defensive copy)
  - `Expiry.equals(other: Expiry): boolean`

- [ ] **Step 1: Write failing tests**

`packages/backend/src/domain/model/Expiry.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Expiry } from './Expiry.js';

describe('Expiry', () => {
  describe('create', () => {
    it('parses a valid future date', () => {
      const future = new Date(Date.now() + 86_400_000);
      const result = Expiry.create(future);
      expect(result.ok).toBe(true);
    });

    it('parses a past date', () => {
      const past = new Date(Date.now() - 86_400_000);
      const result = Expiry.create(past);
      expect(result.ok).toBe(true);
    });

    it('rejects invalid date', () => {
      const result = Expiry.create(new Date('invalid'));
      expect(result.ok).toBe(false);
    });
  });

  describe('fromNow', () => {
    it('creates expiry N days from reference date', () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const result = Expiry.fromNow(7, now);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.date.toISOString()).toBe('2026-01-08T00:00:00.000Z');
      }
    });

    it('rejects zero days', () => {
      expect(Expiry.fromNow(0).ok).toBe(false);
    });

    it('rejects negative days', () => {
      expect(Expiry.fromNow(-1).ok).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('returns false before expiry date', () => {
      const future = new Date('2099-01-01T00:00:00Z');
      const result = Expiry.create(future);
      if (result.ok) {
        expect(result.value.isExpired(new Date('2026-01-01T00:00:00Z'))).toBe(false);
      }
    });

    it('returns true after expiry date', () => {
      const past = new Date('2020-01-01T00:00:00Z');
      const result = Expiry.create(past);
      if (result.ok) {
        expect(result.value.isExpired(new Date('2026-01-01T00:00:00Z'))).toBe(true);
      }
    });

    it('returns true exactly at expiry date', () => {
      const date = new Date('2026-06-01T12:00:00Z');
      const result = Expiry.create(date);
      if (result.ok) {
        expect(result.value.isExpired(date)).toBe(true);
      }
    });
  });

  describe('date', () => {
    it('returns a defensive copy', () => {
      const original = new Date('2026-06-01T00:00:00Z');
      const result = Expiry.create(original);
      if (result.ok) {
        const copy = result.value.date;
        copy.setFullYear(2000);
        expect(result.value.date.getFullYear()).toBe(2026);
      }
    });
  });

  describe('equals', () => {
    it('returns true for same date', () => {
      const a = Expiry.create(new Date('2026-06-01T00:00:00Z'));
      const b = Expiry.create(new Date('2026-06-01T00:00:00Z'));
      if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/domain/model/Expiry.test.ts
```

- [ ] **Step 3: Implement Expiry**

`packages/backend/src/domain/model/Expiry.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidExpiry {
  readonly _tag = 'InvalidExpiry' as const;
  constructor(readonly message: string) {}
}

export class Expiry {
  private constructor(private readonly _date: Date) {}

  static create(date: Date): Result<Expiry, InvalidExpiry> {
    if (isNaN(date.getTime())) return err(new InvalidExpiry('Invalid date'));
    return ok(new Expiry(new Date(date.getTime())));
  }

  static fromNow(days: number, now: Date = new Date()): Result<Expiry, InvalidExpiry> {
    if (days <= 0) return err(new InvalidExpiry('Duration must be positive'));
    const date = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return ok(new Expiry(date));
  }

  get date(): Date {
    return new Date(this._date.getTime());
  }

  isExpired(now: Date = new Date()): boolean {
    return now >= this._date;
  }

  equals(other: Expiry): boolean {
    return this._date.getTime() === other._date.getTime();
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/domain/model/Expiry.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain/model/Expiry*
git commit -m "feat(backend): add Expiry value object"
```

---

### Task 4: Attachment Entity

**Files:**
- Create: `packages/backend/src/domain/model/Attachment.ts`
- Create: `packages/backend/src/domain/model/Attachment.test.ts`

**Interfaces:**
- Consumes: `FileName`, `FileSize`, `StorageKey`
- Produces: `Attachment` class with readonly `id: string`, `fileName: FileName`, `fileSize: FileSize`, `storageKey: StorageKey`

- [ ] **Step 1: Write failing tests**

`packages/backend/src/domain/model/Attachment.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Attachment } from './Attachment.js';
import { FileName } from './FileName.js';
import { FileSize } from './FileSize.js';
import { StorageKey } from './StorageKey.js';

function validAttachment(overrides?: { id?: string }) {
  const fileName = FileName.create('photo.jpg');
  const fileSize = FileSize.create(1024);
  const storageKey = StorageKey.create('transfers/t1/a1');
  if (!fileName.ok || !fileSize.ok || !storageKey.ok) throw new Error('test setup');
  return new Attachment(
    overrides?.id ?? 'att-1',
    fileName.value,
    fileSize.value,
    storageKey.value,
  );
}

describe('Attachment', () => {
  it('exposes id, fileName, fileSize, storageKey', () => {
    const att = validAttachment();
    expect(att.id).toBe('att-1');
    expect(att.fileName.value).toBe('photo.jpg');
    expect(att.fileSize.bytes).toBe(1024);
    expect(att.storageKey.value).toBe('transfers/t1/a1');
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/domain/model/Attachment.test.ts
```

- [ ] **Step 3: Implement Attachment**

`packages/backend/src/domain/model/Attachment.ts`:
```typescript
import type { FileName } from './FileName.js';
import type { FileSize } from './FileSize.js';
import type { StorageKey } from './StorageKey.js';

export class Attachment {
  constructor(
    readonly id: string,
    readonly fileName: FileName,
    readonly fileSize: FileSize,
    readonly storageKey: StorageKey,
  ) {}
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/domain/model/Attachment.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain/model/Attachment*
git commit -m "feat(backend): add Attachment entity"
```

---

### Task 5: Transfer Aggregate

**Files:**
- Create: `packages/backend/src/domain/model/Transfer.ts`
- Create: `packages/backend/src/domain/model/Transfer.test.ts`

**Interfaces:**
- Consumes: `ShareLink`, `Expiry`, `FileSize`, `Attachment`, `Result` from shared
- Produces:
  - `Transfer.create(id, shareLink, expiry, maxTotalSizeBytes): Transfer`
  - `Transfer.reconstitute(id, shareLink, expiry, maxTotalSizeBytes, status, attachments): Transfer`
  - `Transfer.addAttachment(att): Result<undefined, TransferError>`
  - `Transfer.finalize(): Result<undefined, TransferError>`
  - `Transfer.isDownloadable(now?): boolean`
  - `Transfer.isExpired(now?): boolean`
  - `Transfer.totalSizeBytes(): number`
  - Readonly: `id`, `shareLink`, `expiry`, `status`, `attachments`
  - Error types: `TransferNotCollecting`, `TransferSizeLimitExceeded`, `TransferEmpty`

- [ ] **Step 1: Write failing tests**

`packages/backend/src/domain/model/Transfer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Transfer } from './Transfer.js';
import { Attachment } from './Attachment.js';
import { ShareLink } from './ShareLink.js';
import { Expiry } from './Expiry.js';
import { FileName } from './FileName.js';
import { FileSize } from './FileSize.js';
import { StorageKey } from './StorageKey.js';

function makeShareLink(): ShareLink {
  const r = ShareLink.create('V1StGXR8_Z5jdHi6B-myT');
  if (!r.ok) throw new Error('test setup');
  return r.value;
}

function makeFutureExpiry(): Expiry {
  const r = Expiry.create(new Date('2099-01-01T00:00:00Z'));
  if (!r.ok) throw new Error('test setup');
  return r.value;
}

function makePastExpiry(): Expiry {
  const r = Expiry.create(new Date('2020-01-01T00:00:00Z'));
  if (!r.ok) throw new Error('test setup');
  return r.value;
}

function makeAttachment(id: string, sizeBytes: number): Attachment {
  const fn = FileName.create('file.txt');
  const fs = FileSize.create(sizeBytes);
  const sk = StorageKey.create(`transfers/t1/${id}`);
  if (!fn.ok || !fs.ok || !sk.ok) throw new Error('test setup');
  return new Attachment(id, fn.value, fs.value, sk.value);
}

const MAX_SIZE = 10_000;

describe('Transfer', () => {
  describe('create', () => {
    it('starts in collecting state', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      expect(t.status).toBe('collecting');
    });

    it('has no attachments initially', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      expect(t.attachments).toHaveLength(0);
    });
  });

  describe('addAttachment', () => {
    it('adds attachment in collecting state', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      const result = t.addAttachment(makeAttachment('a1', 100));
      expect(result.ok).toBe(true);
      expect(t.attachments).toHaveLength(1);
    });

    it('rejects when not collecting (ready)', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.finalize();
      const result = t.addAttachment(makeAttachment('a2', 100));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error._tag).toBe('TransferNotCollecting');
    });

    it('rejects when total size would exceed limit', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), 150);
      t.addAttachment(makeAttachment('a1', 100));
      const result = t.addAttachment(makeAttachment('a2', 100));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error._tag).toBe('TransferSizeLimitExceeded');
    });

    it('accepts attachment right at the limit', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), 200);
      t.addAttachment(makeAttachment('a1', 100));
      const result = t.addAttachment(makeAttachment('a2', 100));
      expect(result.ok).toBe(true);
    });
  });

  describe('finalize', () => {
    it('transitions to ready', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      const result = t.finalize();
      expect(result.ok).toBe(true);
      expect(t.status).toBe('ready');
    });

    it('rejects when no attachments', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      const result = t.finalize();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error._tag).toBe('TransferEmpty');
    });

    it('rejects when already finalized', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.finalize();
      const result = t.finalize();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error._tag).toBe('TransferNotCollecting');
    });
  });

  describe('totalSizeBytes', () => {
    it('sums all attachment sizes', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.addAttachment(makeAttachment('a2', 200));
      expect(t.totalSizeBytes()).toBe(300);
    });

    it('returns 0 with no attachments', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      expect(t.totalSizeBytes()).toBe(0);
    });
  });

  describe('isDownloadable', () => {
    it('returns true when ready and not expired', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.finalize();
      expect(t.isDownloadable(new Date('2026-01-01'))).toBe(true);
    });

    it('returns false when collecting', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      expect(t.isDownloadable()).toBe(false);
    });

    it('returns false when ready but expired', () => {
      const t = Transfer.create('t1', makeShareLink(), makePastExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.finalize();
      expect(t.isDownloadable()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('delegates to Expiry', () => {
      const t = Transfer.create('t1', makeShareLink(), makePastExpiry(), MAX_SIZE);
      expect(t.isExpired()).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('restores a transfer with given state', () => {
      const att = makeAttachment('a1', 100);
      const t = Transfer.reconstitute('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE, 'ready', [att]);
      expect(t.status).toBe('ready');
      expect(t.attachments).toHaveLength(1);
      expect(t.id).toBe('t1');
    });
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd packages/backend && pnpm test -- src/domain/model/Transfer.test.ts
```

- [ ] **Step 3: Implement Transfer**

`packages/backend/src/domain/model/Transfer.ts`:
```typescript
import { type Result, ok, err } from '@wetransferish/shared';
import type { ShareLink } from './ShareLink.js';
import type { Expiry } from './Expiry.js';
import type { Attachment } from './Attachment.js';

export type TransferStatus = 'collecting' | 'ready';

export class TransferNotCollecting {
  readonly _tag = 'TransferNotCollecting' as const;
  readonly message = 'Transfer is not in collecting state';
}

export class TransferSizeLimitExceeded {
  readonly _tag = 'TransferSizeLimitExceeded' as const;
  readonly message = 'Transfer size limit exceeded';
}

export class TransferEmpty {
  readonly _tag = 'TransferEmpty' as const;
  readonly message = 'Transfer must have at least one attachment';
}

export type TransferError = TransferNotCollecting | TransferSizeLimitExceeded | TransferEmpty;

export class Transfer {
  private readonly _attachments: Attachment[] = [];

  private constructor(
    readonly id: string,
    readonly shareLink: ShareLink,
    private readonly _expiry: Expiry,
    private readonly _maxTotalSizeBytes: number,
    private _status: TransferStatus,
  ) {}

  static create(
    id: string,
    shareLink: ShareLink,
    expiry: Expiry,
    maxTotalSizeBytes: number,
  ): Transfer {
    return new Transfer(id, shareLink, expiry, maxTotalSizeBytes, 'collecting');
  }

  static reconstitute(
    id: string,
    shareLink: ShareLink,
    expiry: Expiry,
    maxTotalSizeBytes: number,
    status: TransferStatus,
    attachments: Attachment[],
  ): Transfer {
    const transfer = new Transfer(id, shareLink, expiry, maxTotalSizeBytes, status);
    transfer._attachments.push(...attachments);
    return transfer;
  }

  get status(): TransferStatus {
    return this._status;
  }

  get expiry(): Expiry {
    return this._expiry;
  }

  get attachments(): readonly Attachment[] {
    return [...this._attachments];
  }

  get maxTotalSizeBytes(): number {
    return this._maxTotalSizeBytes;
  }

  totalSizeBytes(): number {
    return this._attachments.reduce((sum, a) => sum + a.fileSize.bytes, 0);
  }

  addAttachment(attachment: Attachment): Result<undefined, TransferError> {
    if (this._status !== 'collecting') {
      return err(new TransferNotCollecting());
    }
    const newTotal = this.totalSizeBytes() + attachment.fileSize.bytes;
    if (newTotal > this._maxTotalSizeBytes) {
      return err(new TransferSizeLimitExceeded());
    }
    this._attachments.push(attachment);
    return ok(undefined);
  }

  finalize(): Result<undefined, TransferError> {
    if (this._status !== 'collecting') {
      return err(new TransferNotCollecting());
    }
    if (this._attachments.length === 0) {
      return err(new TransferEmpty());
    }
    this._status = 'ready';
    return ok(undefined);
  }

  isDownloadable(now: Date = new Date()): boolean {
    return this._status === 'ready' && !this._expiry.isExpired(now);
  }

  isExpired(now: Date = new Date()): boolean {
    return this._expiry.isExpired(now);
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd packages/backend && pnpm test -- src/domain/model/Transfer.test.ts
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add packages/backend/src/domain/model/Transfer*
git commit -m "feat(backend): add Transfer aggregate with invariant enforcement"
```

---

### Task 6: Port Interfaces

**Files:**
- Create: `packages/backend/src/domain/port/TransferRepository.ts`
- Create: `packages/backend/src/domain/port/FileStorage.ts`
- Create: `packages/backend/src/domain/port/IdGenerator.ts`
- Create: `packages/backend/src/domain/port/ArchiveCreator.ts`

**Interfaces:**
- Consumes: `Transfer`, `ShareLink`, `StorageKey`, `FileSize` from domain model, `Readable` from `node:stream`
- Produces:
  - `TransferRepository`: `save(transfer)`, `findById(id)`, `findByShareLink(shareLink)`
  - `FileStorage`: `store(key, stream, size)`, `retrieve(key)`
  - `IdGenerator`: `generateId()`, `generateShareLink()`
  - `ArchiveCreator`: `createZip(entries): Readable`

- [ ] **Step 1: Create TransferRepository port**

`packages/backend/src/domain/port/TransferRepository.ts`:
```typescript
import type { Transfer } from '../model/Transfer.js';
import type { ShareLink } from '../model/ShareLink.js';

export interface TransferRepository {
  save(transfer: Transfer): Promise<void>;
  findById(id: string): Promise<Transfer | null>;
  findByShareLink(shareLink: ShareLink): Promise<Transfer | null>;
}
```

- [ ] **Step 2: Create FileStorage port**

`packages/backend/src/domain/port/FileStorage.ts`:
```typescript
import type { Readable } from 'node:stream';
import type { StorageKey } from '../model/StorageKey.js';
import type { FileSize } from '../model/FileSize.js';

export interface FileStorage {
  store(key: StorageKey, stream: Readable, size: FileSize): Promise<void>;
  retrieve(key: StorageKey): Promise<Readable>;
}
```

- [ ] **Step 3: Create IdGenerator port**

`packages/backend/src/domain/port/IdGenerator.ts`:
```typescript
import type { ShareLink } from '../model/ShareLink.js';

export interface IdGenerator {
  generateId(): string;
  generateShareLink(): ShareLink;
}
```

- [ ] **Step 4: Create ArchiveCreator port**

`packages/backend/src/domain/port/ArchiveCreator.ts`:
```typescript
import type { Readable } from 'node:stream';

export interface ArchiveEntry {
  name: string;
  stream: Readable;
}

export interface ArchiveCreator {
  createZip(entries: ArchiveEntry[]): Readable;
}
```

- [ ] **Step 5: Verify compilation**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add packages/backend/src/domain/port/
git commit -m "feat(backend): add port interfaces for repository, storage, id generation, archive"
```
