import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AppHeaderProps {
  rightAction?: ReactNode;
}

export function AppHeader({ rightAction }: AppHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div
        className="app-header-brand"
        onClick={() => navigate('/')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') navigate('/');
        }}
        role="button"
        tabIndex={0}
      >
        <img src="/app-icon.png" alt="" className="app-header-icon" />
        <h1>
          단어 암기장
          <span className="app-version-badge" aria-hidden="true">
            v2
          </span>
        </h1>
      </div>
      {rightAction && <div className="app-header-action">{rightAction}</div>}
    </header>
  );
}
