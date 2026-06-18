import type { ShareLink } from '../model/ShareLink.js';

export interface IdGenerator {
  generateId(): string;
  generateShareLink(): ShareLink;
}
