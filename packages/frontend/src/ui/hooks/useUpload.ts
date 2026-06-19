import { useState, useTransition } from 'react';
import type { UploadProgress } from '../../domain/model/UploadProgress.js';
import { sendTransfer } from '../../config/container.js';

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

export function useUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [progressMap, setProgressMap] = useState<Map<number, UploadProgress>>(new Map());
  const [state, setState] = useState<UploadState>('idle');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const addFiles = (newFiles: File[]) => {
    startTransition(() => {
      setFiles((prev) => [...prev, ...newFiles]);
    });
  };

  const upload = async () => {
    if (files.length === 0) return;
    setState('uploading');
    setError(null);

    try {
      const result = await sendTransfer.execute(files, (progress) => {
        setProgressMap((prev) => {
          const next = new Map(prev);
          next.set(progress.fileIndex, progress);
          return next;
        });
      });
      setShareLink(result.shareLink);
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setState('error');
    }
  };

  const reset = () => {
    setFiles([]);
    setProgressMap(new Map());
    setState('idle');
    setShareLink(null);
    setError(null);
  };

  return { files, progressMap, state, shareLink, error, isPending, addFiles, upload, reset };
}
