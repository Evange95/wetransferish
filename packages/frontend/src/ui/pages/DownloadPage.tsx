import { useParams } from 'react-router';
import { useTransferInfo } from '../hooks/useTransferInfo.js';

export function DownloadPage() {
  const { shareLink } = useParams<{ shareLink: string }>();
  const { transfer, loading, error } = useTransferInfo(shareLink!);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '48px' }}>Loading...</div>;
  if (error) return <div style={{ textAlign: 'center', marginTop: '48px', color: '#e74c3c' }}>{error}</div>;
  if (!transfer) return null;

  if (transfer.expired) {
    return <div style={{ textAlign: 'center', marginTop: '48px', color: '#e74c3c' }}>This transfer has expired.</div>;
  }

  const totalSizeKB = (transfer.totalSize / 1024).toFixed(1);

  return (
    <div style={{ maxWidth: '600px', margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center' }}>Download</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>
        {transfer.attachments.length} file{transfer.attachments.length > 1 ? 's' : ''} — {totalSizeKB} KB
      </p>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {transfer.attachments.map((att) => (
          <li key={att.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
            <span>{att.name}</span>
            <a href={`/api/transfers/${shareLink}/attachments/${att.id}/download`} download>
              Download
            </a>
          </li>
        ))}
      </ul>

      {transfer.attachments.length > 1 && (
        <a
          href={`/api/transfers/${shareLink}/download`}
          download="transfer.zip"
          style={{ display: 'block', textAlign: 'center', marginTop: '16px', padding: '12px 24px', fontSize: '16px' }}
        >
          Download all as ZIP
        </a>
      )}
    </div>
  );
}
