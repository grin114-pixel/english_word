import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AppHeaderProps {
  rightAction?: ReactNode;
  onHomeClick?: () => void;
}

export function AppHeader({ rightAction, onHomeClick }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Link
        to="/"
        className="app-header-brand"
        aria-label="홈으로 이동"
        onClick={() => onHomeClick?.()}
      >
        <img src="/app-icon.png" alt="" className="app-header-icon" />
        <h1>
          단어 암기장
          <span className="app-version-badge" aria-hidden="true">
            v2
          </span>
        </h1>
      </Link>
      {rightAction && <div className="app-header-action">{rightAction}</div>}
    </header>
  );
}
