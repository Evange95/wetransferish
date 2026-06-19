import type { FastifyInstance } from 'fastify';
import type { CreateTransfer } from '../../../application/CreateTransfer.js';
import type { UploadAttachment } from '../../../application/UploadAttachment.js';
import type { FinalizeTransfer } from '../../../application/FinalizeTransfer.js';
import { FileName } from '../../../domain/model/FileName.js';
import { FileSize } from '../../../domain/model/FileSize.js';
import type {
  CreateTransferResponse,
  UploadAttachmentResponse,
  FinalizeTransferResponse,
} from '@wetransferish/shared';

interface ErrorResponse {
  readonly error: string;
}

export interface UploadRouteDeps {
  createTransfer: CreateTransfer;
  uploadAttachment: UploadAttachment;
  finalizeTransfer: FinalizeTransfer;
}

export async function uploadRoutes(app: FastifyInstance, deps: UploadRouteDeps): Promise<void> {
  app.post<{ Reply: CreateTransferResponse | ErrorResponse }>('/api/transfers', async (_req, reply) => {
    const result = await deps.createTransfer.execute();
    if (!result.ok) {
      return reply.status(500).send({ error: result.error.message });
    }
    return reply.status(201).send({
      transferId: result.value.transferId,
      shareLink: result.value.shareLink.value,
    });
  });

  app.post<{ Params: { transferId: string }; Reply: UploadAttachmentResponse | ErrorResponse }>(
    '/api/transfers/:transferId/attachments',
    async (req, reply) => {
      const file = await req.file();
      if (!file) return reply.status(400).send({ error: 'No file provided' });

      const fileNameResult = FileName.create(file.filename);
      if (!fileNameResult.ok) return reply.status(400).send({ error: fileNameResult.error.message });

      const fileSizeHeader = req.headers['content-length'];
      const sizeValue = fileSizeHeader ? Number(fileSizeHeader) : 0;
      const fileSizeResult = FileSize.create(sizeValue);
      if (!fileSizeResult.ok) return reply.status(400).send({ error: fileSizeResult.error.message });

      const result = await deps.uploadAttachment.execute(
        req.params.transferId,
        fileNameResult.value,
        fileSizeResult.value,
        file.file,
      );

      if (!result.ok) {
        const status = result.error._tag === 'TransferNotFound' ? 404 : 400;
        return reply.status(status).send({ error: result.error.message });
      }

      return reply.status(201).send({
        attachmentId: result.value.id,
        fileName: result.value.fileName.value,
        fileSize: result.value.fileSize.bytes,
      });
    },
  );

  app.post<{ Params: { transferId: string }; Reply: FinalizeTransferResponse | ErrorResponse }>(
    '/api/transfers/:transferId/finalize',
    async (req, reply) => {
      const result = await deps.finalizeTransfer.execute(req.params.transferId);
      if (!result.ok) {
        const status = result.error._tag === 'TransferNotFound' ? 404 : 400;
        return reply.status(status).send({ error: result.error.message });
      }
      return reply.status(200).send({
        shareLink: result.value.shareLink.value,
        expiresAt: result.value.expiresAt.toISOString(),
      });
    },
  );
}
