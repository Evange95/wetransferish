import { describe, it, expect } from 'vitest';
import { ok, err, type Result } from './result.js';

describe('Result', () => {
  describe('ok', () => {
    it('wraps a value with ok: true', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });

    it('narrows type via discriminant', () => {
      const result: Result<number, string> = ok(42);
      if (result.ok) {
        const value: number = result.value;
        expect(value).toBe(42);
      } else {
        expect.unreachable();
      }
    });
  });

  describe('err', () => {
    it('wraps an error with ok: false', () => {
      const result = err('fail');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('fail');
    });

    it('narrows type via discriminant', () => {
      const result: Result<number, string> = err('fail');
      if (!result.ok) {
        const error: string = result.error;
        expect(error).toBe('fail');
      } else {
        expect.unreachable();
      }
    });
  });
});
