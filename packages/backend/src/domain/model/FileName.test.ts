import { describe, it, expect } from 'vitest';
import { FileName } from './FileName.js';

describe('FileName', () => {
  it('parses a valid name', () => {
    const result = FileName.create('document.pdf');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.value).toBe('document.pdf');
  });

  it('trims whitespace', () => {
    const result = FileName.create('  photo.jpg  ');
    if (result.ok) expect(result.value.value).toBe('photo.jpg');
  });

  it('sanitizes path separators', () => {
    const result = FileName.create('../../etc/passwd');
    if (result.ok) expect(result.value.value).toBe('.._.._etc_passwd');
  });

  it('sanitizes backslashes', () => {
    const result = FileName.create('folder\\file.txt');
    if (result.ok) expect(result.value.value).toBe('folder_file.txt');
  });

  it('rejects empty string', () => {
    expect(FileName.create('').ok).toBe(false);
  });

  it('rejects whitespace-only string', () => {
    expect(FileName.create('   ').ok).toBe(false);
  });

  it('rejects names longer than 255 chars', () => {
    expect(FileName.create('a'.repeat(256)).ok).toBe(false);
  });

  it('accepts name exactly 255 chars', () => {
    expect(FileName.create('a'.repeat(255)).ok).toBe(true);
  });

  it('compares equality by value', () => {
    const a = FileName.create('file.txt');
    const b = FileName.create('file.txt');
    if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
  });
});
