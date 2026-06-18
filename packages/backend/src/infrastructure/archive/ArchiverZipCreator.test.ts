import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { createUnzip } from 'node:zlib';
import { ArchiverZipCreator } from './ArchiverZipCreator.js';

async function collectStream(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe('ArchiverZipCreator', () => {
  const creator = new ArchiverZipCreator();

  it('produces a valid ZIP stream with entries', async () => {
    const entries = [
      { name: 'hello.txt', stream: Readable.from(Buffer.from('hello')) },
      { name: 'world.txt', stream: Readable.from(Buffer.from('world')) },
    ];

    const zipStream = creator.createZip(entries);
    const zipBuffer = await collectStream(zipStream);

    // ZIP magic bytes: PK\x03\x04
    expect(zipBuffer[0]).toBe(0x50);
    expect(zipBuffer[1]).toBe(0x4b);
    expect(zipBuffer.length).toBeGreaterThan(0);
  });

  it('produces a stream for empty entries', async () => {
    const zipStream = creator.createZip([]);
    const zipBuffer = await collectStream(zipStream);
    expect(zipBuffer.length).toBeGreaterThan(0);
  });
});
