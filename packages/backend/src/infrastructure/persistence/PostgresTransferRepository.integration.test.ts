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
