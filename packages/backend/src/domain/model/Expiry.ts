import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidExpiry {
  readonly _tag = 'InvalidExpiry' as const;
  constructor(readonly message: string) {}
}

export class Expiry {
  private constructor(private readonly _date: Date) {}

  static create(date: Date): Result<Expiry, InvalidExpiry> {
    if (isNaN(date.getTime())) return err(new InvalidExpiry('Invalid date'));
    return ok(new Expiry(new Date(date.getTime())));
  }

  static fromNow(days: number, now: Date = new Date()): Result<Expiry, InvalidExpiry> {
    if (days <= 0) return err(new InvalidExpiry('Duration must be positive'));
    const date = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return ok(new Expiry(date));
  }

  get date(): Date {
    return new Date(this._date.getTime());
  }

  isExpired(now: Date = new Date()): boolean {
    return now >= this._date;
  }

  equals(other: Expiry): boolean {
    return this._date.getTime() === other._date.getTime();
  }
}
