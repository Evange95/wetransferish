import type { Attachment } from './Attachment.js';

export interface Transfer {
  readonly totalSize: number;
  readonly attachments: readonly Attachment[];
  readonly expiresAt: Date;
  readonly expired: boolean;
}
