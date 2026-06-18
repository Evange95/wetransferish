import { type Result, ok, err } from '@wetransferish/shared';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { ShareLink } from '../domain/model/ShareLink.js';
import { TransferNotFound } from './errors.js';

export interface TransferInfo {
  totalSize: number;
  attachments: readonly { id: string; name: string; size: number }[];
  expiresAt: Date;
  expired: boolean;
}

export type GetTransferInfoError = TransferNotFound;

export class GetTransferInfo {
  constructor(private readonly repo: TransferRepository) {}

  async execute(shareLink: ShareLink): Promise<Result<TransferInfo, GetTransferInfoError>> {
    const transfer = await this.repo.findByShareLink(shareLink);
    if (!transfer) return err(new TransferNotFound());

    return ok({
      totalSize: transfer.totalSizeBytes(),
      attachments: transfer.attachments.map((a) => ({
        id: a.id,
        name: a.fileName.value,
        size: a.fileSize.bytes,
      })),
      expiresAt: transfer.expiry.date,
      expired: transfer.isExpired(),
    });
  }
}
