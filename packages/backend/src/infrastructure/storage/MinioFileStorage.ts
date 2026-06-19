import type { Readable } from 'node:stream';
import type { Client as MinioClient } from 'minio';
import type { FileStorage } from '../../domain/port/FileStorage.js';
import type { StorageKey } from '../../domain/model/StorageKey.js';
import type { FileSize } from '../../domain/model/FileSize.js';

export class MinioFileStorage implements FileStorage {
  constructor(
    private readonly client: MinioClient,
    private readonly bucket: string,
  ) {}

  async store(key: StorageKey, stream: Readable, size: FileSize): Promise<void> {
    await this.client.putObject(this.bucket, key.value, stream, size.bytes);
  }

  async retrieve(key: StorageKey): Promise<Readable> {
    return await this.client.getObject(this.bucket, key.value);
  }
}
