import type { TransferRepository } from '../../domain/port/TransferRepository.js';
import type { Transfer } from '../../domain/model/Transfer.js';
import type { ShareLink } from '../../domain/model/ShareLink.js';

export class InMemoryTransferRepository implements TransferRepository {
  private readonly transfers = new Map<string, Transfer>();

  async save(transfer: Transfer): Promise<void> {
    this.transfers.set(transfer.id, transfer);
  }

  async findById(id: string): Promise<Transfer | null> {
    return this.transfers.get(id) ?? null;
  }

  async findByShareLink(shareLink: ShareLink): Promise<Transfer | null> {
    for (const transfer of this.transfers.values()) {
      if (transfer.shareLink.equals(shareLink)) return transfer;
    }
    return null;
  }
}
