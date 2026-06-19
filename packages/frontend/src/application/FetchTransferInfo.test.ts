import { describe, it, expect, beforeEach } from 'vitest';
import { FetchTransferInfo } from './FetchTransferInfo.js';
import { FakeTransferGateway } from './fakes/FakeTransferGateway.js';

describe('FetchTransferInfo', () => {
  let gateway: FakeTransferGateway;
  let useCase: FetchTransferInfo;

  beforeEach(() => {
    gateway = new FakeTransferGateway();
    useCase = new FetchTransferInfo(gateway);
  });

  it('returns parsed transfer info', async () => {
    const info = await useCase.execute('V1StGXR8_Z5jdHi6B-myT');
    expect(info.totalSize).toBe(1024);
    expect(info.attachments).toHaveLength(1);
    expect(info.expired).toBe(false);
  });
});
