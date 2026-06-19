import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import FormData from 'form-data';
import { uploadRoutes } from './uploadRoutes.js';
import { downloadRoutes } from './downloadRoutes.js';
import { CreateTransfer } from '../../../application/CreateTransfer.js';
import { UploadAttachment } from '../../../application/UploadAttachment.js';
import { FinalizeTransfer } from '../../../application/FinalizeTransfer.js';
import { GetTransferInfo } from '../../../application/GetTransferInfo.js';
import { DownloadAttachment } from '../../../application/DownloadAttachment.js';
import { DownloadTransfer } from '../../../application/DownloadTransfer.js';
import { InMemoryTransferRepository } from '../../../application/fakes/InMemoryTransferRepository.js';
import { InMemoryFileStorage } from '../../../application/fakes/InMemoryFileStorage.js';
import { StubIdGenerator } from '../../../application/fakes/StubIdGenerator.js';
import { FakeArchiveCreator } from '../../../application/fakes/FakeArchiveCreator.js';

describe('E2E: upload → finalize → info → download', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const repo = new InMemoryTransferRepository();
    const storage = new InMemoryFileStorage();
    const idGen = new StubIdGenerator();
    const archiver = new FakeArchiveCreator();

    const createTransfer = new CreateTransfer(repo, idGen, 7, 10_000_000);
    const uploadAttachment = new UploadAttachment(repo, storage, idGen);
    const finalizeTransfer = new FinalizeTransfer(repo);
    const getTransferInfo = new GetTransferInfo(repo);
    const downloadAttachment = new DownloadAttachment(repo, storage);
    const downloadTransfer = new DownloadTransfer(repo, storage, archiver);

    app = Fastify();
    await app.register(multipart, { limits: { fileSize: 10_000_000 } });
    await app.register(async (i) =>
      uploadRoutes(i, { createTransfer, uploadAttachment, finalizeTransfer }),
    );
    await app.register(async (i) =>
      downloadRoutes(i, { getTransferInfo, downloadAttachment, downloadTransfer }),
    );
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('full upload-download flow', async () => {
    // 1. Create transfer
    const createRes = await app.inject({ method: 'POST', url: '/api/transfers' });
    expect(createRes.statusCode).toBe(201);
    const { transferId, shareLink } = createRes.json();
    expect(transferId).toBeTruthy();
    expect(shareLink).toBeTruthy();

    // 2. Upload a file via multipart
    const form = new FormData();
    form.append('file', Buffer.from('test content'), {
      filename: 'test.txt',
      contentType: 'text/plain',
    });
    const uploadRes = await app.inject({
      method: 'POST',
      url: `/api/transfers/${transferId}/attachments`,
      payload: form,
      headers: form.getHeaders(),
    });
    expect(uploadRes.statusCode).toBe(201);
    const { attachmentId } = uploadRes.json();
    expect(attachmentId).toBeTruthy();

    // 3. Finalize
    const finalizeRes = await app.inject({
      method: 'POST',
      url: `/api/transfers/${transferId}/finalize`,
    });
    expect(finalizeRes.statusCode).toBe(200);
    const finalizeBody = finalizeRes.json();
    expect(finalizeBody.shareLink).toBe(shareLink);
    expect(finalizeBody.expiresAt).toBeTruthy();

    // 4. Get info
    const infoRes = await app.inject({
      method: 'GET',
      url: `/api/transfers/${shareLink}`,
    });
    expect(infoRes.statusCode).toBe(200);
    const info = infoRes.json();
    expect(info.attachments).toHaveLength(1);
    expect(info.attachments[0].id).toBe(attachmentId);
    expect(info.attachments[0].name).toBe('test.txt');
    expect(info.expired).toBe(false);

    // 5. Download single file
    const downloadRes = await app.inject({
      method: 'GET',
      url: `/api/transfers/${shareLink}/attachments/${attachmentId}/download`,
    });
    expect(downloadRes.statusCode).toBe(200);
    expect(downloadRes.body).toBe('test content');

    // 6. Download ZIP
    const zipRes = await app.inject({
      method: 'GET',
      url: `/api/transfers/${shareLink}/download`,
    });
    expect(zipRes.statusCode).toBe(200);
    expect(zipRes.body).toContain('test.txt');
    expect(zipRes.body).toContain('test content');
  });

  it('handles multiple sequential file uploads and lists all on download', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/transfers' });
    const { transferId, shareLink } = createRes.json();

    const fileNames = ['alpha.txt', 'beta.txt', 'gamma.txt'];
    const attachmentIds: string[] = [];

    for (const name of fileNames) {
      const form = new FormData();
      form.append('file', Buffer.from(`content of ${name}`), { filename: name, contentType: 'text/plain' });
      const res = await app.inject({
        method: 'POST',
        url: `/api/transfers/${transferId}/attachments`,
        payload: form,
        headers: form.getHeaders(),
      });
      expect(res.statusCode).toBe(201);
      attachmentIds.push(res.json().attachmentId);
    }

    await app.inject({ method: 'POST', url: `/api/transfers/${transferId}/finalize` });

    const infoRes = await app.inject({ method: 'GET', url: `/api/transfers/${shareLink}` });
    const info = infoRes.json();
    expect(info.attachments).toHaveLength(3);
    expect(info.attachments.map((a: { name: string }) => a.name)).toEqual(fileNames);

    for (let i = 0; i < fileNames.length; i++) {
      const dlRes = await app.inject({
        method: 'GET',
        url: `/api/transfers/${shareLink}/attachments/${attachmentIds[i]}/download`,
      });
      expect(dlRes.statusCode).toBe(200);
      expect(dlRes.body).toBe(`content of ${fileNames[i]}`);
    }

    const zipRes = await app.inject({ method: 'GET', url: `/api/transfers/${shareLink}/download` });
    expect(zipRes.statusCode).toBe(200);
    for (const name of fileNames) {
      expect(zipRes.body).toContain(name);
    }
  });

  it('returns 404 when creating attachments for non-existent transfer', async () => {
    const form = new FormData();
    form.append('file', Buffer.from('data'), {
      filename: 'file.txt',
      contentType: 'text/plain',
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/transfers/non-existent/attachments',
      payload: form,
      headers: form.getHeaders(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 400 when finalizing an empty transfer', async () => {
    const createRes = await app.inject({ method: 'POST', url: '/api/transfers' });
    const { transferId } = createRes.json();

    const finalizeRes = await app.inject({
      method: 'POST',
      url: `/api/transfers/${transferId}/finalize`,
    });
    expect(finalizeRes.statusCode).toBe(400);
  });

  it('returns 404 for info on unknown share link', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/transfers/aaaaabbbbbcccccddddde',
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for download of unknown attachment', async () => {
    // Create, upload, finalize first
    const createRes = await app.inject({ method: 'POST', url: '/api/transfers' });
    const { transferId, shareLink } = createRes.json();

    const form = new FormData();
    form.append('file', Buffer.from('data'), {
      filename: 'file.txt',
      contentType: 'text/plain',
    });
    await app.inject({
      method: 'POST',
      url: `/api/transfers/${transferId}/attachments`,
      payload: form,
      headers: form.getHeaders(),
    });
    await app.inject({
      method: 'POST',
      url: `/api/transfers/${transferId}/finalize`,
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/transfers/${shareLink}/attachments/non-existent/download`,
    });
    expect(res.statusCode).toBe(404);
  });
});
