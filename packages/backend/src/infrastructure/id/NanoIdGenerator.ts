import { nanoid } from 'nanoid';
import type { IdGenerator } from '../../domain/port/IdGenerator.js';
import { ShareLink } from '../../domain/model/ShareLink.js';

export class NanoIdGenerator implements IdGenerator {
  generateId(): string {
    return nanoid();
  }

  generateShareLink(): ShareLink {
    const raw = nanoid(21);
    const result = ShareLink.create(raw);
    if (!result.ok) throw new Error(`nanoid produced invalid ShareLink: ${raw}`);
    return result.value;
  }
}
