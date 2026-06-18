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
