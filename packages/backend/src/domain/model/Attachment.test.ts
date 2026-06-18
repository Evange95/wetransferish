import { describe, it, expect } from 'vitest';
import { Attachment } from './Attachment.js';
import { FileName } from './FileName.js';
import { FileSize } from './FileSize.js';
import { StorageKey } from './StorageKey.js';

function validAttachment(overrides?: { id?: string }) {
  const fileName = FileName.create('photo.jpg');
  const fileSize = FileSize.create(1024);
  const storageKey = StorageKey.create('transfers/t1/a1');
  if (!fileName.ok || !fileSize.ok || !storageKey.ok) throw new Error('test setup');
  return new Attachment(
    overrides?.id ?? 'att-1',
    fileName.value,
    fileSize.value,
    storageKey.value,
  );
}

describe('Attachment', () => {
  it('exposes id, fileName, fileSize, storageKey', () => {
    const att = validAttachment();
    expect(att.id).toBe('att-1');
    expect(att.fileName.value).toBe('photo.jpg');
    expect(att.fileSize.bytes).toBe(1024);
    expect(att.storageKey.value).toBe('transfers/t1/a1');
  });
});
