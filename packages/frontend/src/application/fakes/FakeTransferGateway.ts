import type { TransferGateway, CreateTransferResult } from '../../domain/port/TransferGateway.js';
import type { Transfer } from '../../domain/model/Transfer.js';
import type { UploadProgress } from '../../domain/model/UploadProgress.js';

export class FakeTransferGateway implements TransferGateway {
  uploadedFiles: { transferId: string; fileName: string }[] = [];
  finalized = false;

  async createTransfer(): Promise<CreateTransferResult> {
    return { transferId: 't-1', shareLink: 'V1StGXR8_Z5jdHi6B-myT' };
  }

  async uploadFile(
    transferId: string,
    file: File,
    onProgress: (p: UploadProgress) => void,
    fileIndex: number,
  ): Promise<{ attachmentId: string }> {
    this.uploadedFiles.push({ transferId, fileName: file.name });
    onProgress({ fileIndex, fileName: file.name, loaded: file.size, total: file.size, status: 'done' });
    return { attachmentId: `att-${fileIndex}` };
  }

  async finalizeTransfer(_transferId: string): Promise<{ shareLink: string; expiresAt: string }> {
    this.finalized = true;
    return { shareLink: 'V1StGXR8_Z5jdHi6B-myT', expiresAt: '2026-12-01T00:00:00Z' };
  }

  async getTransferInfo(_shareLink: string): Promise<Transfer> {
    return {
      totalSize: 1024,
      attachments: [{ id: 'a1', name: 'test.txt', size: 1024 }],
      expiresAt: new Date('2026-12-01'),
      expired: false,
    };
  }
}
