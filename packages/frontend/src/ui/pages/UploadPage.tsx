import { DropZone } from '../components/DropZone.js';
import { FileList } from '../components/FileList.js';
import { ShareLinkCard } from '../components/ShareLinkCard.js';
import { useUpload } from '../hooks/useUpload.js';

export function UploadPage() {
  const { files, progressMap, state, shareLink, error, addFiles, upload, reset } = useUpload();

  return (
    <div style={{ maxWidth: '600px', margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '32px' }}>Wetransferish</h1>

      {state === 'done' && shareLink ? (
        <>
          <ShareLinkCard shareLink={shareLink} />
          <button onClick={reset} style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}>
            Send another
          </button>
        </>
      ) : (
        <>
          <DropZone onFiles={addFiles} />
          <FileList files={files} progressMap={progressMap} />

          {files.length > 0 && state !== 'uploading' && (
            <button
              onClick={upload}
              style={{ marginTop: '16px', padding: '12px 24px', fontSize: '16px', cursor: 'pointer' }}
            >
              Send {files.length} file{files.length > 1 ? 's' : ''}
            </button>
          )}

          {state === 'uploading' && <p>Uploading...</p>}
          {error && <p style={{ color: '#e74c3c' }}>{error}</p>}
        </>
      )}
    </div>
  );
}
