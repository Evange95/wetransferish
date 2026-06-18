import type { Transfer } from '../model/Transfer.js';
import type { ShareLink } from '../model/ShareLink.js';

export interface TransferRepository {
  save(transfer: Transfer): Promise<void>;
  findById(id: string): Promise<Transfer | null>;
  findByShareLink(shareLink: ShareLink): Promise<Transfer | null>;
}
