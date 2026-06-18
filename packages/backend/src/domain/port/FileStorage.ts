import type { Readable } from 'node:stream';
import type { StorageKey } from '../model/StorageKey.js';
import type { FileSize } from '../model/FileSize.js';

export interface FileStorage {
  store(key: StorageKey, stream: Readable, size: FileSize): Promise<void>;
  retrieve(key: StorageKey): Promise<Readable>;
}
