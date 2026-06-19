import { describe, it, expect, beforeEach } from 'vitest';
import { SendTransfer } from './SendTransfer.js';
import { FakeTransferGateway } from './fakes/FakeTransferGateway.js';
import type { UploadProgress } from '../domain/model/UploadProgress.js';

function makeFile(name: string, size: number): File {
  return new File([new ArrayBuffer(size)], name);
}

describe('SendTransfer', () => {
  let gateway: FakeTransferGateway;
  let useCase: SendTransfer;

  beforeEach(() => {
    gateway = new FakeTransferGateway();
    useCase = new SendTransfer(gateway, 3);
  });

  it('creates a transfer, uploads all files, and finalizes', async () => {
    const files = [makeFile('a.txt', 10), makeFile('b.txt', 20)];
    const progresses: UploadProgress[] = [];

    const result = await useCase.execute(files, (p) => progresses.push(p));

    expect(result.shareLink).toBe('V1StGXR8_Z5jdHi6B-myT');
    expect(gateway.uploadedFiles).toHaveLength(2);
    expect(gateway.finalized).toBe(true);
    expect(progresses).toHaveLength(2);
  });

  it('uploads with concurrency limit', async () => {
    const files = [makeFile('1.txt', 1), makeFile('2.txt', 1), makeFile('3.txt', 1), makeFile('4.txt', 1)];
    await useCase.execute(files, () => {});
    expect(gateway.uploadedFiles).toHaveLength(4);
  });
});
