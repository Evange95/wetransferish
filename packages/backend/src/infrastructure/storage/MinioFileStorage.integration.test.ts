import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Readable } from 'node:stream';
import { Client as MinioClient } from 'minio';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { MinioFileStorage } from './MinioFileStorage.js';
import { StorageKey } from '../../domain/model/StorageKey.js';
import { FileSize } from '../../domain/model/FileSize.js';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe('MinioFileStorage', () => {
  let container: StartedTestContainer;
  let storage: MinioFileStorage;
  const BUCKET = 'test-bucket';

  beforeAll(async () => {
    container = await new GenericContainer('minio/minio')
      .withCommand(['server', '/data'])
      .withEnvironment({ MINIO_ROOT_USER: 'minioadmin', MINIO_ROOT_PASSWORD: 'minioadmin' })
      .withExposedPorts(9000)
      .start();

    const client = new MinioClient({
      endPoint: container.getHost(),
      port: container.getMappedPort(9000),
      useSSL: false,
      accessKey: 'minioadmin',
      secretKey: 'minioadmin',
    });

    const exists = await client.bucketExists(BUCKET);
    if (!exists) await client.makeBucket(BUCKET);

    storage = new MinioFileStorage(client, BUCKET);
  }, 60_000);

  afterAll(async () => {
    await container.stop();
  });

  it('stores and retrieves a file via streaming', async () => {
    const key = StorageKey.create('test/file1.txt');
    const size = FileSize.create(11);
    if (!key.ok || !size.ok) throw new Error('setup');

    const input = Readable.from(Buffer.from('hello world'));
    await storage.store(key.value, input, size.value);

    const output = await storage.retrieve(key.value);
    const data = await streamToBuffer(output);
    expect(data.toString('utf-8')).toBe('hello world');
  });

  it('handles binary data', async () => {
    const key = StorageKey.create('test/binary.bin');
    const binaryData = Buffer.from([0x00, 0xff, 0x42, 0xde, 0xad]);
    const size = FileSize.create(binaryData.length);
    if (!key.ok || !size.ok) throw new Error('setup');

    await storage.store(key.value, Readable.from(binaryData), size.value);

    const output = await storage.retrieve(key.value);
    const data = await streamToBuffer(output);
    expect(data).toEqual(binaryData);
  });
}, 120_000);
