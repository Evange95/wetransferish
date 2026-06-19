import type { UploadProgress } from '../../domain/model/UploadProgress.js';

interface ProgressBarProps {
  progress: UploadProgress;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const percent = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
  const color = progress.status === 'error' ? '#e74c3c' : progress.status === 'done' ? '#2ecc71' : '#4a90d9';

  return (
    <div style={{ width: '100%', backgroundColor: '#eee', borderRadius: '4px', height: '8px' }}>
      <div
        data-testid="progress-fill"
        style={{
          width: `${percent}%`,
          backgroundColor: color,
          height: '100%',
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}
