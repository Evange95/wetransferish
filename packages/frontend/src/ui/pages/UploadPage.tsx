import { useRef } from 'react';
import { DropZone } from '../components/DropZone.js';
import { FileList } from '../components/FileList.js';
import { ShareLinkCard } from '../components/ShareLinkCard.js';
import { PageShell } from '../components/PageShell.js';
import { useUpload } from '../hooks/useUpload.js';
import { formatBytes, mono, sans } from '../utils.js';

export function UploadPage() {
  const { files, progressMap, state, shareLink, error, addFiles, upload, reset, removeFile } = useUpload();
  const addMoreRef = useRef<HTMLInputElement>(null);

  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const count = files.length;
  const summaryLine = `${count} file${count === 1 ? '' : 's'} · ${formatBytes(totalSize)}`;

  const overallProgress = count
    ? Array.from(progressMap.values()).reduce((a, p) => a + (p.loaded / p.total) * 100, 0) / count
    : 0;
  const dashOffset = 125.66 * (1 - overallProgress / 100);

  const isIdle = state === 'idle';
  const isUploading = state === 'uploading';
  const isDone = state === 'done';
  const isFiles = state === 'idle' && count > 0;

  const onPickMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  return (
    <PageShell>
      <input type="file" multiple ref={addMoreRef} onChange={onPickMore} style={{ display: 'none' }} />

      {isIdle && count === 0 && (
        <DropZone onFiles={addFiles} />
      )}

      {(isFiles || isUploading || isDone || (state === 'error')) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'wt-up .4s ease both' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: '#17150f', letterSpacing: '-.02em' }}>
                {isUploading ? 'Sending…' : isDone ? 'Done' : 'Ready to send'}
              </h1>
              <p style={{ marginTop: 5, fontFamily: mono, fontSize: 12.5, color: '#8a857b' }}>{summaryLine}</p>
            </div>
            {isUploading && (
              <div style={{ position: 'relative', width: 50, height: 50, flex: 'none' }}>
                <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(23,21,15,.10)" strokeWidth="4" />
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#17150f" strokeWidth="4" strokeLinecap="round"
                    strokeDasharray="125.66" strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset .25s ease' }} />
                </svg>
                <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: mono, fontSize: 10.5, color: '#3c382f' }}>
                  {Math.round(overallProgress)}%
                </span>
              </div>
            )}
          </div>

          <FileList files={files} progressMap={progressMap} canRemove={isFiles} onRemove={removeFile} />

          {isFiles && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button onClick={() => addMoreRef.current?.click()} style={{
                alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(23,21,15,.12)',
                background: 'transparent', color: '#56524a', fontFamily: sans, fontSize: 13.5, cursor: 'pointer',
                transition: 'border-color .2s, color .2s',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Add more
              </button>
              <button onClick={upload} style={{
                position: 'relative', overflow: 'hidden', width: '100%', padding: 17, border: 'none', cursor: 'pointer',
                borderRadius: 14, background: '#17150f', color: '#f4f3ef', fontFamily: sans,
                fontSize: 16, fontWeight: 600, letterSpacing: '-.01em',
                boxShadow: '0 10px 28px -12px rgba(23,21,15,.5)', transition: 'transform .2s, box-shadow .2s',
              }}>
                Send · {summaryLine}
              </button>
            </div>
          )}

          {isUploading && (
            <button disabled style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11,
              width: '100%', padding: 17, border: 'none', borderRadius: 14,
              background: 'rgba(23,21,15,.06)', color: '#56524a', fontFamily: sans,
              fontSize: 16, fontWeight: 600, cursor: 'default',
            }}>
              <span style={{ width: 17, height: 17, borderRadius: '50%', border: '2.4px solid rgba(23,21,15,.18)', borderTopColor: '#17150f', animation: 'wt-spin .7s linear infinite' }} />
              Uploading…
            </button>
          )}

          {isDone && shareLink && (
            <>
              <ShareLinkCard shareLink={shareLink} summaryLine={summaryLine} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a857b', fontFamily: sans, fontSize: 14, transition: 'color .2s' }}>
                  Send another
                </button>
              </div>
            </>
          )}

          {error && <p style={{ color: '#c0392b', fontSize: 14 }}>{error}</p>}
        </div>
      )}
    </PageShell>
  );
}
