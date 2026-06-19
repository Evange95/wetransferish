// @ts-expect-error archiver v8 exports ZipArchive but @types/archiver lacks it
import { ZipArchive } from 'archiver';
import type { Readable } from 'node:stream';
import type { ArchiveCreator, ArchiveEntry } from '../../domain/port/ArchiveCreator.js';

export class ArchiverZipCreator implements ArchiveCreator {
  createZip(entries: ArchiveEntry[]): Readable {
    const archive = new ZipArchive({ store: true });
    for (const entry of entries) {
      archive.append(entry.stream, { name: entry.name });
    }
    archive.finalize();
    return archive as unknown as Readable;
  }
}
