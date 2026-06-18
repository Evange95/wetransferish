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
