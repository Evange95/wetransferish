import { Readable } from 'node:stream';
import type { FileStorage } from '../../domain/port/FileStorage.js';
import type { StorageKey } from '../../domain/model/StorageKey.js';
import type { FileSize } from '../../domain/model/FileSize.js';

export class InMemoryFileStorage implements FileStorage {
  private readonly files = new Map<string, Buffer>();

  async store(key: StorageKey, stream: Readable, _size: FileSize): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    this.files.set(key.value, Buffer.concat(chunks));
  }

  async retrieve(key: StorageKey): Promise<Readable> {
    const data = this.files.get(key.value);
    if (!data) throw new Error(`File not found: ${key.value}`);
    return Readable.from(data);
  }

  has(key: StorageKey): boolean {
    return this.files.has(key.value);
  }

  getBuffer(key: StorageKey): Buffer | undefined {
    return this.files.get(key.value);
  }
}
