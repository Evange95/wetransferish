import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidFileName {
  readonly _tag = 'InvalidFileName' as const;
  constructor(readonly message: string) {}
}

export class FileName {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Result<FileName, InvalidFileName> {
    const trimmed = raw.trim();
    if (trimmed.length === 0) return err(new InvalidFileName('Must not be empty'));
    if (trimmed.length > 255) return err(new InvalidFileName('Must not exceed 255 characters'));
    const sanitized = trimmed.replace(/[/\\]/g, '_');
    return ok(new FileName(sanitized));
  }

  get value(): string {
    return this._value;
  }

  equals(other: FileName): boolean {
    return this._value === other._value;
  }
}
