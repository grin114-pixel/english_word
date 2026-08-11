import { useLayoutEffect, useRef } from 'react';
import { wrapGrayTags } from '../utils/grayText';

interface BulkTextareaProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  showGrayToolbar?: boolean;
  fill?: boolean;
  label?: string;
  toolbarAlign?: 'top' | 'label';
}

export function BulkTextarea({
  value,
  onChange,
  rows = 6,
  showGrayToolbar = true,
  fill = false,
  label,
  toolbarAlign = 'top',
}: BulkTextareaProps) {
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

  const grayButton = (
    <button
      type="button"
      className="btn btn-outline small"
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleApplyGray}
    >
      회색 글자
    </button>
  );

  if (!showGrayToolbar) {
    return (
      <textarea
        className={fill ? 'bulk-textarea-fill' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={fill ? undefined : rows}
      />
    );
  }

  return (
    <div className={`bulk-textarea-wrap${fill ? ' bulk-textarea-wrap-fill' : ''}`}>
      {toolbarAlign === 'label' && label ? (
        <div className="field-label-row">
          <span className="field-label">{label}</span>
          {grayButton}
        </div>
      ) : (
        <>
          {showGrayToolbar && <div className="bulk-textarea-toolbar">{grayButton}</div>}
        </>
      )}
      <textarea
        ref={textareaRef}
        className={fill ? 'bulk-textarea-fill' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={fill ? undefined : rows}
      />
    </div>
  );
}
