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
