import type { ViewMode } from '../types';

interface FilterBarProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const TABS: { mode: ViewMode; label: string }[] = [
  { mode: 'study', label: '학습' },
  { mode: 'word', label: '단어' },
  { mode: 'meaning', label: '뜻' },
  { mode: 'sentence', label: '문장' },
];

export function FilterBar({ mode, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.mode}
          type="button"
          role="tab"
          aria-selected={mode === tab.mode}
          className={`filter-tab${mode === tab.mode ? ' active' : ''}`}
          onClick={() => onChange(tab.mode)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
