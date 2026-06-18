import { describe, it, expect } from 'vitest';
import { NanoIdGenerator } from './NanoIdGenerator.js';
import { ShareLink } from '../../domain/model/ShareLink.js';

describe('NanoIdGenerator', () => {
  const gen = new NanoIdGenerator();

  it('generates unique IDs', () => {
    const a = gen.generateId();
    const b = gen.generateId();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('generates valid ShareLinks', () => {
    const link = gen.generateShareLink();
    expect(link).toBeInstanceOf(ShareLink);
    expect(link.value).toHaveLength(21);
  });

  it('generates unique ShareLinks', () => {
    const a = gen.generateShareLink();
    const b = gen.generateShareLink();
    expect(a.equals(b)).toBe(false);
  });
});
