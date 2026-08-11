import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AppHeaderProps {
  rightAction?: ReactNode;
  onHomeClick?: () => void;
}

function HeaderTitle({ text }: { text: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const title = titleRef.current;
    if (!wrap || !title) return;

    const fit = () => {
      const maxWidth = wrap.clientWidth;
      let size = 17;

      title.style.fontSize = `${size}px`;
      while (size > 10 && title.scrollWidth > maxWidth) {
        size -= 0.5;
        title.style.fontSize = `${size}px`;
      }
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={wrapRef} className="app-header-title-wrap">
      <span ref={titleRef} className="app-header-title">
        {text}
      </span>
    </span>
  );
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
        <HeaderTitle text="단어 암기장" />
      </Link>
      {rightAction && <div className="app-header-action">{rightAction}</div>}
    </header>
  );
}
