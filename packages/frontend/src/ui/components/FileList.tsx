import type { UploadProgress } from '../../domain/model/UploadProgress.js';
import { ProgressBar } from './ProgressBar.js';

interface FileListProps {
  files: File[];
  progressMap: Map<number, UploadProgress>;
}

export function FileList({ files, progressMap }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {files.map((file, index) => {
        const progress = progressMap.get(index);
        return (
          <li key={`${file.name}-${index}`} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>{file.name}</span>
              <span style={{ color: '#999' }}>{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            {progress && <ProgressBar progress={progress} />}
          </li>
        );
      })}
    </ul>
  );
}
