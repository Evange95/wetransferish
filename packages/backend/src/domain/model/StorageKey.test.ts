import { describe, it, expect } from 'vitest';
import { StorageKey } from './StorageKey.js';

describe('StorageKey', () => {
  it('parses a valid key', () => {
    const result = StorageKey.create('transfers/abc/file1');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe('transfers/abc/file1');
  });

  it('rejects empty string', () => {
    expect(StorageKey.create('').ok).toBe(false);
  });

  it('compares equality by value', () => {
    const a = StorageKey.create('key-a');
    const b = StorageKey.create('key-a');
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});
