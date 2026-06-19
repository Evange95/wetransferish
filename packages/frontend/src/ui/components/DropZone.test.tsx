import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DropZone } from './DropZone.js';

afterEach(cleanup);

describe('DropZone', () => {
  it('calls onFiles when files are dropped', () => {
    const onFiles = vi.fn();
    render(<DropZone onFiles={onFiles} />);

    const dropzone = screen.getByTestId('dropzone');
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it('renders drop instruction text', () => {
    render(<DropZone onFiles={() => {}} />);
    expect(screen.getByText(/drag/i)).toBeInTheDocument();
  });
});
