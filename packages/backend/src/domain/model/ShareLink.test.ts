import { describe, it, expect } from 'vitest';
import { ShareLink } from './ShareLink.js';

describe('ShareLink', () => {
  const VALID_LINK = 'V1StGXR8_Z5jdHi6B-myT';

  it('parses a valid 21-char URL-safe string', () => {
    const result = ShareLink.create(VALID_LINK);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe(VALID_LINK);
  });

  it('rejects empty string', () => {
    expect(ShareLink.create('').ok).toBe(false);
  });

  it('rejects too short', () => {
    expect(ShareLink.create('abc').ok).toBe(false);
  });

  it('rejects too long', () => {
    expect(ShareLink.create('a'.repeat(22)).ok).toBe(false);
  });

  it('rejects non-URL-safe characters', () => {
    expect(ShareLink.create('V1StGXR8!Z5jdHi6B-my').ok).toBe(false);
  });

  it('accepts underscores and hyphens', () => {
    expect(ShareLink.create('abc_def-ghi_jkl-mnopq').ok).toBe(true);
  });

  it('compares equality by value', () => {
    const a = ShareLink.create(VALID_LINK);
    const b = ShareLink.create(VALID_LINK);
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});
