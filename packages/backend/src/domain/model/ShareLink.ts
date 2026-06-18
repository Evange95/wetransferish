import { type Result, ok, err } from '@wetransferish/shared';

export class InvalidShareLink {
  readonly _tag = 'InvalidShareLink' as const;
  constructor(readonly message: string) {}
}

const SHARE_LINK_PATTERN = /^[A-Za-z0-9_-]{21}$/;

export class ShareLink {
  private constructor(private readonly _value: string) {}

  static create(raw: string): Result<ShareLink, InvalidShareLink> {
    if (!SHARE_LINK_PATTERN.test(raw)) {
      return err(new InvalidShareLink('Must be exactly 21 URL-safe characters [A-Za-z0-9_-]'));
    }
    return ok(new ShareLink(raw));
  }

  get value(): string {
    return this._value;
  }

  equals(other: ShareLink): boolean {
    return this._value === other._value;
  }
}
