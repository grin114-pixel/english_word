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
      </Link>
      {rightAction && <div className="app-header-action">{rightAction}</div>}
    </header>
  );
}
