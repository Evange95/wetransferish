import type { Transfer } from '../model/Transfer.js';
import type { UploadProgress } from '../model/UploadProgress.js';

export interface CreateTransferResult {
  transferId: string;
  shareLink: string;
}

export interface TransferGateway {
  createTransfer(): Promise<CreateTransferResult>;
  uploadFile(
    transferId: string,
    file: File,
    onProgress: (progress: UploadProgress) => void,
    fileIndex: number,
  ): Promise<{ attachmentId: string }>;
  finalizeTransfer(transferId: string): Promise<{ shareLink: string; expiresAt: string }>;
  getTransferInfo(shareLink: string): Promise<Transfer>;
}
