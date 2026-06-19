import type { TransferGateway } from '../domain/port/TransferGateway.js';
import type { Transfer } from '../domain/model/Transfer.js';

export class FetchTransferInfo {
  constructor(private readonly gateway: TransferGateway) {}

  async execute(shareLink: string): Promise<Transfer> {
    return this.gateway.getTransferInfo(shareLink);
  }
}
