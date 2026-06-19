import { useState, useRef, useEffect } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragActive(true); };
    const onDragLeave = (e: DragEvent) => { if (e.clientX <= 0 && e.clientY <= 0) setDragActive(false); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer?.files;
      if (f?.length) onFiles(Array.from(f));
    };
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [onFiles, disabled]);

  const openPicker = () => inputRef.current?.click();
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  return (
    <>
      <input type="file" multiple ref={inputRef} onChange={onPick} style={{ display: 'none' }} />
      <div
        data-testid="dropzone"
        onClick={openPicker}
        style={{
          position: 'relative',
          cursor: 'pointer',
          borderRadius: 24,
          padding: '72px 32px',
          textAlign: 'center',
          background: '#ffffff',
          border: `1.5px dashed ${dragActive ? 'rgba(23,21,15,.42)' : 'rgba(23,21,15,.16)'}`,
          animation: 'wt-pulse 4.5s ease-in-out infinite',
          transition: 'border-color .35s, transform .35s',
          boxShadow: '0 1px 2px rgba(23,21,15,.04)',
          transform: dragActive ? 'translateY(-2px)' : undefined,
        }}
      >
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 24, pointerEvents: 'none',
          transition: 'opacity .3s',
          boxShadow: '0 0 0 1.5px rgba(23,21,15,.55), 0 26px 60px -22px rgba(23,21,15,.28)',
          opacity: dragActive ? 1 : 0,
        }} />
        <div style={{ width: 68, height: 68, margin: '0 auto 26px', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#17150f' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f4f3ef" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 600, color: '#17150f', letterSpacing: '-.02em' }}>Drop your files</h1>
        <p style={{ marginTop: 10, fontSize: 15, color: '#6f6b62' }}>Up to 2GB, encrypted in transit</p>
        <p style={{ marginTop: 22, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#9b968c', letterSpacing: '.02em' }}>drag anywhere · or click to browse</p>
      </div>
    </>
  );
}
