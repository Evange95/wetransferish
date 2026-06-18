export interface CreateTransferResponse {
  readonly transferId: string;
  readonly shareLink: string;
}

export interface UploadAttachmentResponse {
  readonly attachmentId: string;
  readonly fileName: string;
  readonly fileSize: number;
}

export interface FinalizeTransferResponse {
  readonly shareLink: string;
  readonly expiresAt: string;
}

export interface AttachmentInfoDTO {
  readonly id: string;
  readonly name: string;
  readonly size: number;
}

export interface TransferInfoResponse {
  readonly totalSize: number;
  readonly attachments: readonly AttachmentInfoDTO[];
  readonly expiresAt: string;
  readonly expired: boolean;
}
