CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  share_link TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'collecting',
  expires_at TIMESTAMPTZ NOT NULL,
  max_total_size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  transfer_id TEXT NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_transfer_id ON attachments(transfer_id);
