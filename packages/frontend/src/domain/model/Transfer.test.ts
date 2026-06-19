import { describe, it, expect } from 'vitest';
import type { Transfer } from './Transfer.js';
import type { Attachment } from './Attachment.js';

describe('Transfer (frontend domain)', () => {
  it('represents a transfer with attachments', () => {
    const attachment: Attachment = { id: 'a1', name: 'photo.jpg', size: 1024 };
    const transfer: Transfer = {
      totalSize: 1024,
      attachments: [attachment],
      expiresAt: new Date('2026-12-01'),
      expired: false,
    };

    expect(transfer.attachments).toHaveLength(1);
    expect(transfer.expired).toBe(false);
    expect(transfer.totalSize).toBe(1024);
  });
});
