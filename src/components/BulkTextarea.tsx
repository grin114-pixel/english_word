import { useLayoutEffect, useRef } from 'react';
import { wrapGrayTags } from '../utils/grayText';

interface BulkTextareaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  showGrayToolbar?: boolean;
}

export function BulkTextarea({ value, onChange, rows = 6, showGrayToolbar = true }: BulkTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingRestoreRef = useRef<{ start: number; end: number; scrollTop: number } | null>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const pending = pendingRestoreRef.current;
    if (!textarea || !pending) return;

    pendingRestoreRef.current = null;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(pending.start, pending.end);
    textarea.scrollTop = pending.scrollTop;
  }, [value]);

  const handleApplyGray = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const wrapped = wrapGrayTags(value, textarea.selectionStart, textarea.selectionEnd);
    if (!wrapped) return;

    pendingRestoreRef.current = {
      start: wrapped.selectionStart,
      end: wrapped.selectionEnd,
      scrollTop: textarea.scrollTop,
    };
    onChange(wrapped.value);
  };

  if (!showGrayToolbar) {
    return (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} />
    );
  }

  return (
    <div className="bulk-textarea-wrap">
      <div className="bulk-textarea-toolbar">
        <button
          type="button"
          className="btn btn-outline small"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleApplyGray}
        >
          회색 글자
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
      />
    </div>
  );
}
