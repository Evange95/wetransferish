export interface AppConfig {
  port: number;
  host: string;
  postgres: { connectionString: string };
  minio: { endPoint: string; port: number; accessKey: string; secretKey: string; bucket: string; useSSL: boolean };
  transfer: { defaultExpiryDays: number; maxTotalSizeBytes: number };
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env['PORT'] ?? 3000),
    host: process.env['HOST'] ?? '0.0.0.0',
    postgres: {
      connectionString: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/wetransferish',
    },
    minio: {
      endPoint: process.env['MINIO_ENDPOINT'] ?? 'localhost',
      port: Number(process.env['MINIO_PORT'] ?? 9000),
      accessKey: process.env['MINIO_ACCESS_KEY'] ?? 'minioadmin',
      secretKey: process.env['MINIO_SECRET_KEY'] ?? 'minioadmin',
      bucket: process.env['MINIO_BUCKET'] ?? 'transfers',
      useSSL: process.env['MINIO_USE_SSL'] === 'true',
    },
    transfer: {
      defaultExpiryDays: Number(process.env['TRANSFER_EXPIRY_DAYS'] ?? 7),
      maxTotalSizeBytes: Number(process.env['TRANSFER_MAX_SIZE_BYTES'] ?? 2_000_000_000),
    },
  };
}
