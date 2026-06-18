export class TransferNotFound {
  readonly _tag = 'TransferNotFound' as const;
  readonly message = 'Transfer not found';
}

export class TransferNotDownloadable {
  readonly _tag = 'TransferNotDownloadable' as const;
  readonly message = 'Transfer is not downloadable';
}

export class AttachmentNotFound {
  readonly _tag = 'AttachmentNotFound' as const;
  readonly message = 'Attachment not found';
}

export class InvalidConfiguration {
  readonly _tag = 'InvalidConfiguration' as const;
  constructor(readonly message: string) {}
}
