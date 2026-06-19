import { useState } from 'react';

interface ShareLinkCardProps {
  shareLink: string;
}

export function ShareLinkCard({ shareLink }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}/d/${shareLink}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ padding: '16px', border: '1px solid #2ecc71', borderRadius: '8px', backgroundColor: '#f0fff4' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 'bold', color: '#2ecc71' }}>Transfer ready!</p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          readOnly
          value={fullUrl}
          style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <button onClick={handleCopy} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
