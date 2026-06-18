import type { FileName } from './FileName.js';
import type { FileSize } from './FileSize.js';
import type { StorageKey } from './StorageKey.js';

export class Attachment {
  constructor(
    readonly id: string,
    readonly fileName: FileName,
    readonly fileSize: FileSize,
    readonly storageKey: StorageKey,
  ) {}
}
