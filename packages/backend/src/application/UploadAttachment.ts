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
