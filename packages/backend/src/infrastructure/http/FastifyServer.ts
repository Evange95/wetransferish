import Fastify, { type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(multipart, {
    limits: { fileSize: 2_000_000_000 },
  });
  return app;
}
