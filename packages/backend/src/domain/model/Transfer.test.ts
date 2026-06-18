import { describe, it, expect } from 'vitest';
import { Transfer } from './Transfer.js';
import { Attachment } from './Attachment.js';
import { ShareLink } from './ShareLink.js';
import { Expiry } from './Expiry.js';
import { FileName } from './FileName.js';
import { FileSize } from './FileSize.js';
import { StorageKey } from './StorageKey.js';

function makeShareLink(): ShareLink {
  const r = ShareLink.create('V1StGXR8_Z5jdHi6B-myT');
  if (!r.ok) throw new Error('test setup');
  return r.value;
}

function makeFutureExpiry(): Expiry {
  const r = Expiry.create(new Date('2099-01-01T00:00:00Z'));
  if (!r.ok) throw new Error('test setup');
  return r.value;
}

function makePastExpiry(): Expiry {
  const r = Expiry.create(new Date('2020-01-01T00:00:00Z'));
  if (!r.ok) throw new Error('test setup');
  return r.value;
}

function makeAttachment(id: string, sizeBytes: number): Attachment {
  const fn = FileName.create('file.txt');
  const fs = FileSize.create(sizeBytes);
  const sk = StorageKey.create(`transfers/t1/${id}`);
  if (!fn.ok || !fs.ok || !sk.ok) throw new Error('test setup');
  return new Attachment(id, fn.value, fs.value, sk.value);
}

const MAX_SIZE = 10_000;

describe('Transfer', () => {
  describe('create', () => {
    it('starts in collecting state', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      expect(t.status).toBe('collecting');
    });

    it('has no attachments initially', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      expect(t.attachments).toHaveLength(0);
    });
  });

  describe('addAttachment', () => {
    it('adds attachment in collecting state', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      const result = t.addAttachment(makeAttachment('a1', 100));
      expect(result.ok).toBe(true);
      expect(t.attachments).toHaveLength(1);
    });

    it('rejects when not collecting (ready)', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.finalize();
      const result = t.addAttachment(makeAttachment('a2', 100));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error._tag).toBe('TransferNotCollecting');
    });

    it('rejects when total size would exceed limit', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), 150);
      t.addAttachment(makeAttachment('a1', 100));
      const result = t.addAttachment(makeAttachment('a2', 100));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error._tag).toBe('TransferSizeLimitExceeded');
    });

    it('accepts attachment right at the limit', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), 200);
      t.addAttachment(makeAttachment('a1', 100));
      const result = t.addAttachment(makeAttachment('a2', 100));
      expect(result.ok).toBe(true);
    });
  });

  describe('finalize', () => {
    it('transitions to ready', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      const result = t.finalize();
      expect(result.ok).toBe(true);
      expect(t.status).toBe('ready');
    });

    it('rejects when no attachments', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      const result = t.finalize();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error._tag).toBe('TransferEmpty');
    });

    it('rejects when already finalized', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.finalize();
      const result = t.finalize();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error._tag).toBe('TransferNotCollecting');
    });
  });

  describe('totalSizeBytes', () => {
    it('sums all attachment sizes', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.addAttachment(makeAttachment('a2', 200));
      expect(t.totalSizeBytes()).toBe(300);
    });

    it('returns 0 with no attachments', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      expect(t.totalSizeBytes()).toBe(0);
    });
  });

  describe('isDownloadable', () => {
    it('returns true when ready and not expired', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.finalize();
      expect(t.isDownloadable(new Date('2026-01-01'))).toBe(true);
    });

    it('returns false when collecting', () => {
      const t = Transfer.create('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE);
      expect(t.isDownloadable()).toBe(false);
    });

    it('returns false when ready but expired', () => {
      const t = Transfer.create('t1', makeShareLink(), makePastExpiry(), MAX_SIZE);
      t.addAttachment(makeAttachment('a1', 100));
      t.finalize();
      expect(t.isDownloadable()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('delegates to Expiry', () => {
      const t = Transfer.create('t1', makeShareLink(), makePastExpiry(), MAX_SIZE);
      expect(t.isExpired()).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('restores a transfer with given state', () => {
      const att = makeAttachment('a1', 100);
      const t = Transfer.reconstitute('t1', makeShareLink(), makeFutureExpiry(), MAX_SIZE, 'ready', [att]);
      expect(t.status).toBe('ready');
      expect(t.attachments).toHaveLength(1);
      expect(t.id).toBe('t1');
    });
  });
});
