import type { Readable } from 'node:stream';

export interface ArchiveEntry {
  name: string;
  stream: Readable;
}

export interface ArchiveCreator {
  createZip(entries: ArchiveEntry[]): Readable;
}
