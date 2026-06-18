import { describe, it, expect, beforeEach } from 'vitest';
import { CreateTransfer } from './CreateTransfer.js';
import { InMemoryTransferRepository } from './fakes/InMemoryTransferRepository.js';
import { StubIdGenerator } from './fakes/StubIdGenerator.js';

describe('CreateTransfer', () => {
  let repo: InMemoryTransferRepository;
  let idGen: StubIdGenerator;
  let useCase: CreateTransfer;

  beforeEach(() => {
    repo = new InMemoryTransferRepository();
    idGen = new StubIdGenerator();
    useCase = new CreateTransfer(repo, idGen, 7, 10_000_000);
  });

  it('creates a transfer in collecting state', async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const transfer = await repo.findById(result.value.transferId);
    expect(transfer).not.toBeNull();
    expect(transfer!.status).toBe('collecting');
  });

  it('returns transferId and shareLink', async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.transferId).toBe('id-1');
    expect(result.value.shareLink.value).toBe('link-0000000000000001');
  });

  it('assigns a future expiry', async () => {
    const result = await useCase.execute();
    if (!result.ok) return;

    const transfer = await repo.findById(result.value.transferId);
    expect(transfer!.isExpired()).toBe(false);
  });
});
