import { type Result, ok, err } from '@wetransferish/shared';
import type { ShareLink } from './ShareLink.js';
import type { Expiry } from './Expiry.js';
import type { Attachment } from './Attachment.js';

export type TransferStatus = 'collecting' | 'ready';

export class TransferNotCollecting {
  readonly _tag = 'TransferNotCollecting' as const;
  readonly message = 'Transfer is not in collecting state';
}

export class TransferSizeLimitExceeded {
  readonly _tag = 'TransferSizeLimitExceeded' as const;
  readonly message = 'Transfer size limit exceeded';
}

export class TransferEmpty {
  readonly _tag = 'TransferEmpty' as const;
  readonly message = 'Transfer must have at least one attachment';
}

export type TransferError = TransferNotCollecting | TransferSizeLimitExceeded | TransferEmpty;

export class Transfer {
  private readonly _attachments: Attachment[] = [];

  private constructor(
    readonly id: string,
    readonly shareLink: ShareLink,
    private readonly _expiry: Expiry,
    private readonly _maxTotalSizeBytes: number,
    private _status: TransferStatus,
  ) {}

  static create(
    id: string,
    shareLink: ShareLink,
    expiry: Expiry,
    maxTotalSizeBytes: number,
  ): Transfer {
    return new Transfer(id, shareLink, expiry, maxTotalSizeBytes, 'collecting');
  }

  static reconstitute(
    id: string,
    shareLink: ShareLink,
    expiry: Expiry,
    maxTotalSizeBytes: number,
    status: TransferStatus,
    attachments: Attachment[],
  ): Transfer {
    const transfer = new Transfer(id, shareLink, expiry, maxTotalSizeBytes, status);
    transfer._attachments.push(...attachments);
    return transfer;
  }

  get status(): TransferStatus {
    return this._status;
  }

  get expiry(): Expiry {
    return this._expiry;
  }

  get attachments(): readonly Attachment[] {
    return [...this._attachments];
  }

  get maxTotalSizeBytes(): number {
    return this._maxTotalSizeBytes;
  }

  totalSizeBytes(): number {
    return this._attachments.reduce((sum, a) => sum + a.fileSize.bytes, 0);
  }

  addAttachment(attachment: Attachment): Result<undefined, TransferError> {
    if (this._status !== 'collecting') {
      return err(new TransferNotCollecting());
    }
    const newTotal = this.totalSizeBytes() + attachment.fileSize.bytes;
    if (newTotal > this._maxTotalSizeBytes) {
      return err(new TransferSizeLimitExceeded());
    }
    this._attachments.push(attachment);
    return ok(undefined);
  }

  finalize(): Result<undefined, TransferError> {
    if (this._status !== 'collecting') {
      return err(new TransferNotCollecting());
    }
    if (this._attachments.length === 0) {
      return err(new TransferEmpty());
    }
    this._status = 'ready';
    return ok(undefined);
  }

  isDownloadable(now: Date = new Date()): boolean {
    return this._status === 'ready' && !this._expiry.isExpired(now);
  }

  isExpired(now: Date = new Date()): boolean {
    return this._expiry.isExpired(now);
  }
}
