import type { UploadProgress } from '../../domain/model/UploadProgress.js';
import { formatBytes, fileExt, mono } from '../utils.js';

interface FileListProps {
  files: File[];
  progressMap: Map<number, UploadProgress>;
  canRemove?: boolean;
  onRemove?: (index: number) => void;
}

export function FileList({ files, progressMap, canRemove, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {files.map((file, index) => {
        const progress = progressMap.get(index);
        const pct = progress ? Math.round((progress.loaded / progress.total) * 100) : 0;
        const isDone = progress?.status === 'done';

        return (
          <div key={`${file.name}-${index}`} style={{
            position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', borderRadius: 14, background: '#ffffff',
            border: '1px solid rgba(23,21,15,.08)', boxShadow: '0 1px 2px rgba(23,21,15,.03)',
            transition: 'border-color .3s',
          }}>
            <div style={{
              width: 42, height: 42, flex: 'none', borderRadius: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: mono, fontSize: 11, fontWeight: 500, color: '#4a463d',
              background: 'rgba(23,21,15,.05)', border: '1px solid rgba(23,21,15,.07)',
            }}>
              {fileExt(file.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: '#26241d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
              <div style={{ marginTop: 3, fontFamily: mono, fontSize: 11.5, color: '#8a857b' }}>{formatBytes(file.size)}</div>
            </div>
            {isDone && (
              <div style={{ width: 24, height: 24, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#17150f', animation: 'wt-pop .35s ease both' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f4f3ef" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
            )}
            {canRemove && !progress && onRemove && (
              <button onClick={() => onRemove(index)} style={{
                width: 24, height: 24, flex: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%',
                background: 'rgba(23,21,15,.05)', color: '#8a857b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .2s, color .2s',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            )}
            {progress && !isDone && (
              <div style={{ position: 'absolute', left: 0, bottom: 0, height: 2.5, background: '#17150f', borderRadius: '0 3px 3px 0', transition: 'width .3s ease', width: `${pct}%` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
