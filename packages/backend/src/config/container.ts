import pg from 'pg';
import { Client as MinioClient } from 'minio';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from './env.js';
import { createServer } from '../infrastructure/http/FastifyServer.js';
import { uploadRoutes } from '../infrastructure/http/routes/uploadRoutes.js';
import { downloadRoutes } from '../infrastructure/http/routes/downloadRoutes.js';
import { PostgresTransferRepository } from '../infrastructure/persistence/PostgresTransferRepository.js';
import { MinioFileStorage } from '../infrastructure/storage/MinioFileStorage.js';
import { NanoIdGenerator } from '../infrastructure/id/NanoIdGenerator.js';
import { ArchiverZipCreator } from '../infrastructure/archive/ArchiverZipCreator.js';
import { CreateTransfer } from '../application/CreateTransfer.js';
import { UploadAttachment } from '../application/UploadAttachment.js';
import { FinalizeTransfer } from '../application/FinalizeTransfer.js';
import { GetTransferInfo } from '../application/GetTransferInfo.js';
import { DownloadAttachment } from '../application/DownloadAttachment.js';
import { DownloadTransfer } from '../application/DownloadTransfer.js';

export async function buildApp(config: AppConfig): Promise<{ app: FastifyInstance; pool: pg.Pool }> {
  const pool = new pg.Pool({ connectionString: config.postgres.connectionString });
  const minioClient = new MinioClient({
    endPoint: config.minio.endPoint,
    port: config.minio.port,
    useSSL: config.minio.useSSL,
    accessKey: config.minio.accessKey,
    secretKey: config.minio.secretKey,
  });

  const bucketExists = await minioClient.bucketExists(config.minio.bucket);
  if (!bucketExists) await minioClient.makeBucket(config.minio.bucket);

  const repo = new PostgresTransferRepository(pool);
  const storage = new MinioFileStorage(minioClient, config.minio.bucket);
  const idGen = new NanoIdGenerator();
  const archiver = new ArchiverZipCreator();

  const createTransfer = new CreateTransfer(repo, idGen, config.transfer.defaultExpiryDays, config.transfer.maxTotalSizeBytes);
  const uploadAttachment = new UploadAttachment(repo, storage, idGen);
  const finalizeTransfer = new FinalizeTransfer(repo);
  const getTransferInfo = new GetTransferInfo(repo);
  const downloadAttachment = new DownloadAttachment(repo, storage);
  const downloadTransfer = new DownloadTransfer(repo, storage, archiver);

  const app = await createServer();
  await app.register(async (instance) => uploadRoutes(instance, { createTransfer, uploadAttachment, finalizeTransfer }));
  await app.register(async (instance) => downloadRoutes(instance, { getTransferInfo, downloadAttachment, downloadTransfer }));

  return { app, pool };
}
