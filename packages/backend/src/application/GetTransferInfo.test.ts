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
