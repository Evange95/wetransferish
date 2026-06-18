import type pg from 'pg';
import type { TransferRepository } from '../../domain/port/TransferRepository.js';
import { Transfer, type TransferStatus } from '../../domain/model/Transfer.js';
import { Attachment } from '../../domain/model/Attachment.js';
import { ShareLink } from '../../domain/model/ShareLink.js';
import { Expiry } from '../../domain/model/Expiry.js';
import { FileName } from '../../domain/model/FileName.js';
import { FileSize } from '../../domain/model/FileSize.js';
import { StorageKey } from '../../domain/model/StorageKey.js';

export class PostgresTransferRepository implements TransferRepository {
  constructor(private readonly pool: pg.Pool) {}

  async save(transfer: Transfer): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO transfers (id, share_link, status, expires_at, max_total_size_bytes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET status = $3`,
        [transfer.id, transfer.shareLink.value, transfer.status, transfer.expiry.date, transfer.maxTotalSizeBytes],
      );

      await client.query('DELETE FROM attachments WHERE transfer_id = $1', [transfer.id]);

      for (const att of transfer.attachments) {
        await client.query(
          `INSERT INTO attachments (id, transfer_id, file_name, file_size_bytes, storage_key)
           VALUES ($1, $2, $3, $4, $5)`,
          [att.id, transfer.id, att.fileName.value, att.fileSize.bytes, att.storageKey.value],
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Transfer | null> {
    const transferResult = await this.pool.query('SELECT * FROM transfers WHERE id = $1', [id]);
    if (transferResult.rows.length === 0) return null;

    const attachmentResult = await this.pool.query(
      'SELECT * FROM attachments WHERE transfer_id = $1 ORDER BY created_at',
      [id],
    );

    return this.reconstruct(transferResult.rows[0], attachmentResult.rows);
  }

  async findByShareLink(shareLink: ShareLink): Promise<Transfer | null> {
    const transferResult = await this.pool.query('SELECT * FROM transfers WHERE share_link = $1', [shareLink.value]);
    if (transferResult.rows.length === 0) return null;

    const row = transferResult.rows[0];
    const attachmentResult = await this.pool.query(
      'SELECT * FROM attachments WHERE transfer_id = $1 ORDER BY created_at',
      [row.id],
    );

    return this.reconstruct(row, attachmentResult.rows);
  }

  private reconstruct(row: Record<string, unknown>, attRows: Record<string, unknown>[]): Transfer {
    const shareLink = ShareLink.create(row.share_link as string);
    const expiry = Expiry.create(new Date(row.expires_at as string));
    if (!shareLink.ok) throw new Error(`Corrupt DB: invalid share_link "${row.share_link}"`);
    if (!expiry.ok) throw new Error(`Corrupt DB: invalid expires_at "${row.expires_at}"`);

    const attachments = attRows.map((ar) => {
      const fn = FileName.create(ar.file_name as string);
      const fs = FileSize.create(Number(ar.file_size_bytes));
      const sk = StorageKey.create(ar.storage_key as string);
      if (!fn.ok) throw new Error(`Corrupt DB: invalid file_name "${ar.file_name}"`);
      if (!fs.ok) throw new Error(`Corrupt DB: invalid file_size_bytes "${ar.file_size_bytes}"`);
      if (!sk.ok) throw new Error(`Corrupt DB: invalid storage_key "${ar.storage_key}"`);
      return new Attachment(ar.id as string, fn.value, fs.value, sk.value);
    });

    return Transfer.reconstitute(
      row.id as string,
      shareLink.value,
      expiry.value,
      Number(row.max_total_size_bytes),
      row.status as TransferStatus,
      attachments,
    );
  }
}
