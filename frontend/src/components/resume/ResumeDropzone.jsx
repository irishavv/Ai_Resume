import { useCallback, useId, useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { copy } from '../../constants/copy.js';
import { RESUME_ACCEPT, formatBytes } from '../../lib/resume.js';

/**
 * Keyboard-accessible drag and drop zone backed by a real file input, so the
 * same control works with a mouse, a keyboard and a touch device.
 */
export default function ResumeDropzone({ file, onFileChange, error, disabled = false }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const select = useCallback(
    (fileList) => {
      const next = fileList && fileList[0];
      if (next) onFileChange(next);
    },
    [onFileChange],
  );

  const reset = useCallback(() => {
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleChange = (event) => {
    select(event.target.files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    select(event.dataTransfer?.files);
    reset();
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    setIsDragging(false);
  };

  return (
    <div className="space-y-2">
      {file ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <FileText className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-ink" title={file.name}>
              {file.name}
            </p>
            <p className="text-2xs text-ink-subtle">
              {copy.resume.selectedFile} · PDF · {formatBytes(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              reset();
              onFileChange(null);
            }}
            disabled={disabled}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-line px-2 py-1 text-2xs font-medium text-ink-muted transition-colors hover:border-danger/40 hover:text-danger disabled:cursor-not-allowed disabled:opacity-55"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            {copy.resume.removeFile}
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors',
            'focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-canvas',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-line bg-surface-muted/40 hover:border-primary/40 hover:bg-surface-muted/70',
            disabled ? 'cursor-not-allowed opacity-60' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-subtle">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-xs text-ink-muted">
            {isDragging ? (
              copy.resume.dropzoneActive
            ) : (
              <>
                {copy.resume.dropzoneIdle}{' '}
                <span className="font-medium text-primary underline underline-offset-2">
                  {copy.resume.dropzoneBrowse}
                </span>
              </>
            )}
          </span>
          <span className="text-2xs text-ink-subtle">PDF · max 5 MB</span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={RESUME_ACCEPT}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only"
          />
        </label>
      )}

      <p
        role={error ? 'alert' : undefined}
        className={error ? 'text-2xs text-danger' : 'sr-only'}
      >
        {error || ''}
      </p>
    </div>
  );
}
