import { type Result, ok, err } from '@wetransferish/shared';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { ShareLink } from '../domain/model/ShareLink.js';
import type { TransferError } from '../domain/model/Transfer.js';
import { TransferNotFound } from './errors.js';

export type FinalizeTransferError = TransferNotFound | TransferError;

export class FinalizeTransfer {
  constructor(private readonly repo: TransferRepository) {}

  async execute(
    transferId: string,
  ): Promise<Result<{ shareLink: ShareLink; expiresAt: Date }, FinalizeTransferError>> {
    const transfer = await this.repo.findById(transferId);
    if (!transfer) return err(new TransferNotFound());

    const finalizeResult = transfer.finalize();
    if (!finalizeResult.ok) return err(finalizeResult.error);

    await this.repo.save(transfer);

    return ok({
      shareLink: transfer.shareLink,
      expiresAt: transfer.expiry.date,
    });
  }
}
