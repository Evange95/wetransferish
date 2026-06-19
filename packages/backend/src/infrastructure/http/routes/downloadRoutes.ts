import type { FastifyInstance } from 'fastify';
import type { GetTransferInfo } from '../../../application/GetTransferInfo.js';
import type { DownloadAttachment } from '../../../application/DownloadAttachment.js';
import type { DownloadTransfer } from '../../../application/DownloadTransfer.js';
import { ShareLink } from '../../../domain/model/ShareLink.js';
import type { TransferInfoResponse } from '@wetransferish/shared';

interface ErrorResponse {
  readonly error: string;
}

export interface DownloadRouteDeps {
  getTransferInfo: GetTransferInfo;
  downloadAttachment: DownloadAttachment;
  downloadTransfer: DownloadTransfer;
}

export async function downloadRoutes(app: FastifyInstance, deps: DownloadRouteDeps): Promise<void> {
  app.get<{ Params: { shareLink: string }; Reply: TransferInfoResponse | ErrorResponse }>(
    '/api/transfers/:shareLink',
    async (req, reply) => {
      const shareLinkResult = ShareLink.create(req.params.shareLink);
      if (!shareLinkResult.ok) return reply.status(400).send({ error: shareLinkResult.error.message });

      const result = await deps.getTransferInfo.execute(shareLinkResult.value);
      if (!result.ok) return reply.status(404).send({ error: result.error.message });

      return reply.status(200).send({
        totalSize: result.value.totalSize,
        attachments: result.value.attachments.map((a) => ({ id: a.id, name: a.name, size: a.size })),
        expiresAt: result.value.expiresAt.toISOString(),
        expired: result.value.expired,
      });
    },
  );

  app.get<{ Params: { shareLink: string } }>(
    '/api/transfers/:shareLink/download',
    async (req, reply) => {
      const shareLinkResult = ShareLink.create(req.params.shareLink);
      if (!shareLinkResult.ok) return reply.status(400).send({ error: shareLinkResult.error.message });

      const result = await deps.downloadTransfer.execute(shareLinkResult.value);
      if (!result.ok) {
        const status = result.error._tag === 'TransferNotFound' ? 404 : 410;
        return reply.status(status).send({ error: result.error.message });
      }

      return reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', 'attachment; filename="transfer.zip"')
        .send(result.value.stream);
    },
  );

  app.get<{ Params: { shareLink: string; attachmentId: string } }>(
    '/api/transfers/:shareLink/attachments/:attachmentId/download',
    async (req, reply) => {
      const shareLinkResult = ShareLink.create(req.params.shareLink);
      if (!shareLinkResult.ok) return reply.status(400).send({ error: shareLinkResult.error.message });

      const result = await deps.downloadAttachment.execute(shareLinkResult.value, req.params.attachmentId);
      if (!result.ok) {
        const status = result.error._tag === 'TransferNotFound' ? 404
          : result.error._tag === 'AttachmentNotFound' ? 404
          : 410;
        return reply.status(status).send({ error: result.error.message });
      }

      return reply
        .header('Content-Type', 'application/octet-stream')
        .header('Content-Disposition', `attachment; filename="${result.value.fileName.value}"`)
        .send(result.value.stream);
    },
  );
}
