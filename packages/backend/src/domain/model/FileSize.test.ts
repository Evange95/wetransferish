import { describe, it, expect } from 'vitest';
import { FileSize } from './FileSize.js';

describe('FileSize', () => {
  it('parses a valid size', () => {
    const result = FileSize.create(1024);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.bytes).toBe(1024);
  });

  it('parses zero', () => {
    const result = FileSize.create(0);
    expect(result.ok).toBe(true);
  });

  it('rejects negative numbers', () => {
    const result = FileSize.create(-1);
    expect(result.ok).toBe(false);
  });

  it('rejects NaN', () => {
    const result = FileSize.create(NaN);
    expect(result.ok).toBe(false);
  });

  it('rejects non-integer', () => {
    const result = FileSize.create(1.5);
    expect(result.ok).toBe(false);
  });

  it('compares equality by value', () => {
    const a = FileSize.create(1024);
    const b = FileSize.create(1024);
    const c = FileSize.create(2048);
    if (a.ok && b.ok && c.ok) {
      expect(a.value.equals(b.value)).toBe(true);
      expect(a.value.equals(c.value)).toBe(false);
    }
  });
});
