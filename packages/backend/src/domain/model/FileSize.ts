import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidFileSize {
  readonly _tag = 'InvalidFileSize' as const;
  constructor(readonly message: string) {}
}

export class FileSize {
  private constructor(private readonly _bytes: number) {}

  static create(bytes: number): Result<FileSize, InvalidFileSize> {
    if (!Number.isFinite(bytes)) return err(new InvalidFileSize('Must be a finite number'));
    if (!Number.isInteger(bytes)) return err(new InvalidFileSize('Must be an integer'));
    if (bytes < 0) return err(new InvalidFileSize('Must not be negative'));
    return ok(new FileSize(bytes));
  }

  get bytes(): number {
    return this._bytes;
  }

  equals(other: FileSize): boolean {
    return this._bytes === other._bytes;
  }
}
