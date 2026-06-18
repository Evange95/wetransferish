import { type Result, ok, err } from '@wetransferish/shared';
import type { Readable } from 'node:stream';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { FileStorage } from '../domain/port/FileStorage.js';
import type { ArchiveCreator } from '../domain/port/ArchiveCreator.js';
import type { ShareLink } from '../domain/model/ShareLink.js';
import { TransferNotFound, TransferNotDownloadable } from './errors.js';

export type DownloadTransferError = TransferNotFound | TransferNotDownloadable;

export class DownloadTransfer {
  constructor(
    private readonly repo: TransferRepository,
    private readonly storage: FileStorage,
    private readonly archiveCreator: ArchiveCreator,
  ) {}

  async execute(
    shareLink: ShareLink,
  ): Promise<Result<{ stream: Readable }, DownloadTransferError>> {
    const transfer = await this.repo.findByShareLink(shareLink);
    if (!transfer) return err(new TransferNotFound());
    if (!transfer.isDownloadable()) return err(new TransferNotDownloadable());

    const entries = await Promise.all(
      transfer.attachments.map(async (attachment) => ({
        name: attachment.fileName.value,
        stream: await this.storage.retrieve(attachment.storageKey),
      })),
    );

    const zipStream = this.archiveCreator.createZip(entries);
    return ok({ stream: zipStream });
  }
}
