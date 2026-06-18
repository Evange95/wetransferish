import { type Result, ok, err } from '@wetransferish/shared';
import type { TransferRepository } from '../domain/port/TransferRepository.js';
import type { IdGenerator } from '../domain/port/IdGenerator.js';
import { Transfer } from '../domain/model/Transfer.js';
import { Expiry } from '../domain/model/Expiry.js';
import { ShareLink } from '../domain/model/ShareLink.js';
import { InvalidConfiguration } from './errors.js';

export type CreateTransferError = InvalidConfiguration;

export class CreateTransfer {
  constructor(
    private readonly repo: TransferRepository,
    private readonly idGen: IdGenerator,
    private readonly defaultExpiryDays: number,
    private readonly maxTotalSizeBytes: number,
  ) {}

  async execute(): Promise<Result<{ transferId: string; shareLink: ShareLink }, CreateTransferError>> {
    const id = this.idGen.generateId();
    const shareLink = this.idGen.generateShareLink();

    const expiryResult = Expiry.fromNow(this.defaultExpiryDays);
    if (!expiryResult.ok) return err(new InvalidConfiguration(expiryResult.error.message));

    const transfer = Transfer.create(id, shareLink, expiryResult.value, this.maxTotalSizeBytes);
    await this.repo.save(transfer);

    return ok({ transferId: id, shareLink });
  }
}
