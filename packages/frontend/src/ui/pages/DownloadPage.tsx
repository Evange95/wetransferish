import { useState } from 'react';
import { useParams, Link } from 'react-router';
import { useTransferInfo } from '../hooks/useTransferInfo.js';
import { PageShell } from '../components/PageShell.js';
import { formatBytes, fileExt, mono, sans } from '../utils.js';

function Skeleton() {
  const bar = (h: number, w: string) => ({
    height: h, width: w, borderRadius: h > 20 ? 14 : h > 12 ? 8 : 6,
    background: 'linear-gradient(90deg, rgba(23,21,15,.05), rgba(23,21,15,.10), rgba(23,21,15,.05))',
    backgroundSize: '560px 100%', animation: 'wt-shimmer 1.3s linear infinite',
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={bar(30, '62%')} />
      <div style={bar(15, '40%')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
        <div style={bar(68, '100%')} />
        <div style={bar(68, '100%')} />
      </div>
      <div style={{ ...bar(54, '100%'), marginTop: 8 }} />
    </div>
  );
}

export function DownloadPage() {
  const { shareLink } = useParams<{ shareLink: string }>();
  const { transfer, loading, error } = useTransferInfo(shareLink!);
  const [downloading, setDownloading] = useState(false);

  if (loading) return <PageShell maxWidth={560}><Skeleton /></PageShell>;
  if (error) return (
    <PageShell maxWidth={560}>
      <div style={{ textAlign: 'center', padding: '36px 24px', animation: 'wt-up .45s ease both' }}>
        <div style={{ width: 74, height: 74, margin: '0 auto 26px', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(23,21,15,.09)', boxShadow: '0 1px 2px rgba(23,21,15,.04)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9b968c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </div>
        <h1 style={{ fontSize: 25, fontWeight: 600, color: '#17150f', letterSpacing: '-.02em' }}>Something went wrong</h1>
        <p style={{ marginTop: 11, fontSize: 15, color: '#6f6b62', lineHeight: 1.55, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>{error}</p>
      </div>
    </PageShell>
  );
  if (!transfer) return null;

  if (transfer.expired) {
    return (
      <PageShell maxWidth={560}>
        <div style={{ textAlign: 'center', padding: '36px 24px', animation: 'wt-up .45s ease both' }}>
          <div style={{ width: 74, height: 74, margin: '0 auto 26px', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid rgba(23,21,15,.09)', boxShadow: '0 1px 2px rgba(23,21,15,.04)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9b968c" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 600, color: '#17150f', letterSpacing: '-.02em' }}>This transfer has expired</h1>
          <p style={{ marginTop: 11, fontSize: 15, color: '#6f6b62', lineHeight: 1.55, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Files are kept for 6 days. The sender will need to upload them again to share a fresh link.
          </p>
          <Link to="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 28,
            padding: '13px 22px', borderRadius: 12, textDecoration: 'none',
            background: '#17150f', color: '#f4f3ef', fontFamily: sans, fontSize: 14.5, fontWeight: 500,
            transition: 'transform .2s',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/></svg>
            Send your own files
          </Link>
        </div>
      </PageShell>
    );
  }

  const totalFmt = formatBytes(transfer.totalSize);
  const summaryLine = `${transfer.attachments.length} file${transfer.attachments.length === 1 ? '' : 's'} · ${totalFmt}`;
  const multi = transfer.attachments.length > 1;

  const expiresIn = Math.max(0, Math.ceil((transfer.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  const handleDownloadAll = () => {
    if (downloading) return;
    setDownloading(true);
    window.location.href = `/api/transfers/${shareLink}/download`;
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <PageShell maxWidth={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26, animation: 'wt-up .45s ease both' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 999, background: 'rgba(23,21,15,.05)', border: '1px solid rgba(23,21,15,.09)', marginBottom: 16 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#17150f' }} />
            <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.04em', color: '#56524a' }}>expires in {expiresIn} days</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 600, color: '#17150f', letterSpacing: '-.025em' }}>Ready to download</h1>
          <p style={{ marginTop: 8, fontFamily: mono, fontSize: 13, color: '#8a857b' }}>{summaryLine}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {transfer.attachments.map((att) => (
            <div key={att.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14,
              background: '#ffffff', border: '1px solid rgba(23,21,15,.08)',
              boxShadow: '0 1px 2px rgba(23,21,15,.03)', transition: 'border-color .25s, box-shadow .25s',
            }}>
              <div style={{
                width: 42, height: 42, flex: 'none', borderRadius: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: mono, fontSize: 11, fontWeight: 500, color: '#4a463d',
                background: 'rgba(23,21,15,.05)', border: '1px solid rgba(23,21,15,.07)',
              }}>
                {fileExt(att.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: '#26241d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</div>
                <div style={{ marginTop: 3, fontFamily: mono, fontSize: 11.5, color: '#8a857b' }}>{formatBytes(att.size)}</div>
              </div>
              <a
                href={`/api/transfers/${shareLink}/attachments/${att.id}/download`}
                download
                title="Download"
                style={{
                  width: 38, height: 38, flex: 'none', borderRadius: 10,
                  border: '1px solid rgba(23,21,15,.12)', background: 'transparent', color: '#56524a',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color .2s, color .2s, background .2s', textDecoration: 'none',
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>
              </a>
            </div>
          ))}
        </div>

        <button onClick={handleDownloadAll} style={{
          position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          width: '100%', padding: 17, border: 'none', cursor: 'pointer', borderRadius: 14,
          background: '#17150f', color: '#f4f3ef', fontFamily: sans,
          fontSize: 16, fontWeight: 600, letterSpacing: '-.01em',
          boxShadow: '0 10px 28px -12px rgba(23,21,15,.5)', transition: 'transform .2s, box-shadow .2s',
        }}>
          {downloading ? (
            <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2.3px solid rgba(244,243,239,.3)', borderTopColor: '#f4f3ef', animation: 'wt-spin .7s linear infinite' }} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>
          )}
          {downloading ? 'Preparing…' : `Download${multi ? ' all' : ''} · ${totalFmt}`}
        </button>
      </div>
    </PageShell>
  );
}
