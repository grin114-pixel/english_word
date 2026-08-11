import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'default' | 'large';
  hideTitle?: boolean;
}

export function Modal({ title, onClose, children, size = 'default', hideTitle = false }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const isLarge = size === 'large';

  return (
    <div className={`modal-backdrop${isLarge ? ' modal-backdrop-large' : ''}`} onMouseDown={onClose}>
      <div
        className={`modal-sheet${isLarge ? ' modal-sheet-large' : ''}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`modal-header${hideTitle ? ' modal-header-minimal' : ''}`}>
          {!hideTitle && <h2>{title}</h2>}
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
