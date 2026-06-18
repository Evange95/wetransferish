import { describe, it, expect } from 'vitest';
import { Expiry } from './Expiry.js';

describe('Expiry', () => {
  describe('create', () => {
    it('parses a valid future date', () => {
      const future = new Date(Date.now() + 86_400_000);
      const result = Expiry.create(future);
      expect(result.ok).toBe(true);
    });

    it('parses a past date', () => {
      const past = new Date(Date.now() - 86_400_000);
      const result = Expiry.create(past);
      expect(result.ok).toBe(true);
    });

    it('rejects invalid date', () => {
      const result = Expiry.create(new Date('invalid'));
      expect(result.ok).toBe(false);
    });
  });

  describe('fromNow', () => {
    it('creates expiry N days from reference date', () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const result = Expiry.fromNow(7, now);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.date.toISOString()).toBe('2026-01-08T00:00:00.000Z');
      }
    });

    it('rejects zero days', () => {
      expect(Expiry.fromNow(0).ok).toBe(false);
    });

    it('rejects negative days', () => {
      expect(Expiry.fromNow(-1).ok).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('returns false before expiry date', () => {
      const future = new Date('2099-01-01T00:00:00Z');
      const result = Expiry.create(future);
      if (result.ok) {
        expect(result.value.isExpired(new Date('2026-01-01T00:00:00Z'))).toBe(false);
      }
    });

    it('returns true after expiry date', () => {
      const past = new Date('2020-01-01T00:00:00Z');
      const result = Expiry.create(past);
      if (result.ok) {
        expect(result.value.isExpired(new Date('2026-01-01T00:00:00Z'))).toBe(true);
      }
    });

    it('returns true exactly at expiry date', () => {
      const date = new Date('2026-06-01T12:00:00Z');
      const result = Expiry.create(date);
      if (result.ok) {
        expect(result.value.isExpired(date)).toBe(true);
      }
    });
  });

  describe('date', () => {
    it('returns a defensive copy', () => {
      const original = new Date('2026-06-01T00:00:00Z');
      const result = Expiry.create(original);
      if (result.ok) {
        const copy = result.value.date;
        copy.setFullYear(2000);
        expect(result.value.date.getFullYear()).toBe(2026);
      }
    });
  });

  describe('equals', () => {
    it('returns true for same date', () => {
      const a = Expiry.create(new Date('2026-06-01T00:00:00Z'));
      const b = Expiry.create(new Date('2026-06-01T00:00:00Z'));
      if (a.ok && b.ok) expect(a.value.equals(b.value)).toBe(true);
    });
  });
});
