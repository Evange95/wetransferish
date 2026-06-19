import { useState } from 'react';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = () => {
      if (input.files) onFiles(Array.from(input.files));
    };
    input.click();
  };

  return (
    <div
      data-testid="dropzone"
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      style={{
        border: `2px dashed ${isDragging ? '#4a90d9' : '#ccc'}`,
        borderRadius: '12px',
        padding: '48px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragging ? '#f0f7ff' : 'transparent',
        transition: 'all 0.2s ease',
      }}
    >
      <p style={{ fontSize: '18px', margin: 0, color: '#666' }}>
        Drag files here or click to select
      </p>
    </div>
  );
}
