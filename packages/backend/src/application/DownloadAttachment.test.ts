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
