import type { TransferGateway } from '../domain/port/TransferGateway.js';
import type { UploadProgress } from '../domain/model/UploadProgress.js';

export class SendTransfer {
  constructor(
    private readonly gateway: TransferGateway,
    private readonly maxConcurrency: number = 3,
  ) {}

  async execute(
    files: File[],
    onProgress: (progress: UploadProgress) => void,
  ): Promise<{ shareLink: string }> {
    const { transferId } = await this.gateway.createTransfer();

    const queue = files.map((file, index) => ({ file, index }));
    const executing = new Set<Promise<void>>();

    for (const item of queue) {
      const task = this.gateway
        .uploadFile(transferId, item.file, onProgress, item.index)
        .then(() => { executing.delete(task); });

      executing.add(task);

      if (executing.size >= this.maxConcurrency) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);

    const { shareLink } = await this.gateway.finalizeTransfer(transferId);
    return { shareLink };
  }
}
