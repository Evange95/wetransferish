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
