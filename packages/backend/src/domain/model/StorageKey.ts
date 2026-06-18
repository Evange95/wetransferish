import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidStorageKey {
  readonly _tag = 'InvalidStorageKey' as const;
  constructor(readonly message: string) {}
}

export class StorageKey {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Result<StorageKey, InvalidStorageKey> {
    if (raw.length === 0) return err(new InvalidStorageKey('Must not be empty'));
    return ok(new StorageKey(raw));
  }

  get value(): string {
    return this._value;
  }

  equals(other: StorageKey): boolean {
    return this._value === other._value;
  }
}
