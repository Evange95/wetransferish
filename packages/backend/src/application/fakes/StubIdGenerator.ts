import type { IdGenerator } from '../../domain/port/IdGenerator.js';
import { ShareLink } from '../../domain/model/ShareLink.js';

export class StubIdGenerator implements IdGenerator {
  private idCounter = 0;
  private shareLinkCounter = 0;

  generateId(): string {
    return `id-${++this.idCounter}`;
  }

  generateShareLink(): ShareLink {
    const raw = `link-${String(++this.shareLinkCounter).padStart(16, '0')}`;
    const result = ShareLink.create(raw);
    if (!result.ok) throw new Error(`StubIdGenerator produced invalid ShareLink: ${raw}`);
    return result.value;
  }
}
