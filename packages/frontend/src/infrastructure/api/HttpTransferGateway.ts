import type {
  CreateTransferResponse,
  UploadAttachmentResponse,
  FinalizeTransferResponse,
  TransferInfoResponse,
} from '@wetransferish/shared';
import type { TransferGateway, CreateTransferResult } from '../../domain/port/TransferGateway.js';
import type { Transfer } from '../../domain/model/Transfer.js';
import type { UploadProgress } from '../../domain/model/UploadProgress.js';

export class HttpTransferGateway implements TransferGateway {
  constructor(private readonly baseUrl: string = '') {}

  async createTransfer(): Promise<CreateTransferResult> {
    const res = await fetch(`${this.baseUrl}/api/transfers`, { method: 'POST' });
    if (!res.ok) throw new Error(`Create failed: ${res.status}`);
    const data = (await res.json()) as CreateTransferResponse;
    return { transferId: data.transferId, shareLink: data.shareLink };
  }

  uploadFile(
    transferId: string,
    file: File,
    onProgress: (p: UploadProgress) => void,
    fileIndex: number,
  ): Promise<{ attachmentId: string }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.upload.addEventListener('progress', (e: ProgressEvent<XMLHttpRequestUpload>) => {
        if (e.lengthComputable) {
          onProgress({
            fileIndex,
            fileName: file.name,
            loaded: e.loaded,
            total: e.total,
            status: 'uploading',
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const data = JSON.parse(xhr.responseText) as UploadAttachmentResponse;
          onProgress({ fileIndex, fileName: file.name, loaded: file.size, total: file.size, status: 'done' });
          resolve({ attachmentId: data.attachmentId });
        } else {
          onProgress({ fileIndex, fileName: file.name, loaded: 0, total: file.size, status: 'error' });
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        onProgress({ fileIndex, fileName: file.name, loaded: 0, total: file.size, status: 'error' });
        reject(new Error('Upload network error'));
      });

      xhr.open('POST', `${this.baseUrl}/api/transfers/${transferId}/attachments`);
      xhr.send(formData);
    });
  }

  async finalizeTransfer(transferId: string): Promise<{ shareLink: string; expiresAt: string }> {
    const res = await fetch(`${this.baseUrl}/api/transfers/${transferId}/finalize`, { method: 'POST' });
    if (!res.ok) throw new Error(`Finalize failed: ${res.status}`);
    const data = (await res.json()) as FinalizeTransferResponse;
    return { shareLink: data.shareLink, expiresAt: data.expiresAt };
  }

  async getTransferInfo(shareLink: string): Promise<Transfer> {
    const res = await fetch(`${this.baseUrl}/api/transfers/${shareLink}`);
    if (!res.ok) throw new Error(`Get info failed: ${res.status}`);
    const data = (await res.json()) as TransferInfoResponse;
    return {
      totalSize: data.totalSize,
      attachments: data.attachments.map((a) => ({ id: a.id, name: a.name, size: a.size })),
      expiresAt: new Date(data.expiresAt),
      expired: data.expired,
    };
  }
}
