import { Readable, PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ArchiveCreator, ArchiveEntry } from '../../domain/port/ArchiveCreator.js';

export class FakeArchiveCreator implements ArchiveCreator {
  createZip(entries: ArchiveEntry[]): Readable {
    const output = new PassThrough();

    (async () => {
      for (const entry of entries) {
        const header = Buffer.from(`--- ${entry.name} ---\n`);
        output.write(header);
        await pipeline(entry.stream, output, { end: false });
      }
      output.end();
    })().catch((err) => output.destroy(err));

    return output;
  }
}
