import { useState } from 'react';
import { mono, sans } from '../utils.js';

interface ShareLinkCardProps {
  shareLink: string;
  summaryLine: string;
}

export function ShareLinkCard({ shareLink, summaryLine }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}/d/${shareLink}`;

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(fullUrl); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'wt-up .45s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#17150f', animation: 'wt-pop .45s ease both' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f4f3ef" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#17150f' }}>Transfer ready</div>
          <div style={{ fontFamily: mono, fontSize: 12, color: '#8a857b', marginTop: 2 }}>{summaryLine} · expires in 6 days</div>
        </div>
      </div>

      <div style={{ position: 'relative', borderRadius: 18, padding: 22, overflow: 'hidden', background: '#ffffff', border: '1px solid rgba(23,21,15,.08)', boxShadow: '0 24px 60px -34px rgba(23,21,15,.4)' }}>
        <p style={{ fontFamily: mono, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#9b968c' }}>Share link</p>
        <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
          <input
            readOnly
            value={fullUrl}
            onFocus={(e) => e.target.select()}
            style={{ flex: 1, minWidth: 0, padding: '13px 14px', borderRadius: 11, border: '1px solid rgba(23,21,15,.10)', background: '#f7f6f3', color: '#3c382f', fontFamily: mono, fontSize: 13, outline: 'none' }}
          />
          <button onClick={handleCopy} style={{
            flex: 'none', minWidth: 108, padding: '0 18px', borderRadius: 11, border: 'none', cursor: 'pointer',
            fontFamily: sans, fontSize: 14, fontWeight: 600, transition: 'background .25s, color .25s',
            background: '#17150f', color: '#f4f3ef',
          }}>
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
