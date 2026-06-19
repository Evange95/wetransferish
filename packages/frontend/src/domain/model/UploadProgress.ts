export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadProgress {
  readonly fileIndex: number;
  readonly fileName: string;
  readonly loaded: number;
  readonly total: number;
  readonly status: UploadStatus;
}
