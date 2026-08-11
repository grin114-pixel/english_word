import type { MouseEvent, ReactNode } from 'react';
import { playPronunciation, prefetchPronunciation } from '../utils/pronunciation';
import { GrayText, plainTextForSpeech } from './GrayText';

function SpeakerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor" />
      <path
        d="M15.5 8.5a5 5 0 010 7M18 6a8.5 8.5 0 010 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface SpeakButtonProps {
  word: string;
  label?: string;
  compact?: boolean;
}

export function SpeakButton({ word, label = '발음 듣기', compact = false }: SpeakButtonProps) {
  const speechText = plainTextForSpeech(word);

  const handleSpeak = (e: MouseEvent) => {
    e.stopPropagation();
    playPronunciation(speechText);
  };

  const handleWarm = () => {
    prefetchPronunciation(speechText);
  };

  if (compact) {
    return (
      <button
        type="button"
        className="speak-btn-icon"
        onClick={handleSpeak}
        onMouseEnter={handleWarm}
        onTouchStart={handleWarm}
        aria-label={`${word} ${label}`}
      >
        <SpeakerIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="speak-btn"
      onClick={handleSpeak}
      onMouseEnter={handleWarm}
      onTouchStart={handleWarm}
      aria-label={`${word} ${label}`}
    >
      <SpeakerIcon />
      <span>{label}</span>
    </button>
  );
}

function renderWordText(word: string): ReactNode {
  return <GrayText text={word} />;
}

interface EnglishWordCellProps {
  word: string;
  revealed?: boolean;
  blind?: boolean;
  onReveal?: () => void;
  blindStyle?: 'inline' | 'pill';
  showSpeak?: boolean;
  compact?: boolean;
}

export function EnglishWordCell({
  word,
  revealed = true,
  blind = false,
  onReveal,
  blindStyle = 'inline',
  showSpeak = true,
  compact = false,
}: EnglishWordCellProps) {
  if (blind && !revealed) {
    return (
      <div className={compact ? 'english-word-blind-wrap compact' : 'english-word-blind-wrap'}>
        <button
          type="button"
          className={blindStyle === 'pill' ? 'blind-pill' : 'blind-inline'}
          onClick={onReveal}
        >
          {blindStyle === 'pill' ? '탭해서 보기' : '•••'}
        </button>
        {showSpeak && <SpeakButton word={word} compact={compact} />}
      </div>
    );
  }

  if (compact) {
    return (
      <span className="english-word-cell compact">
        <span className="cell-revealed">{renderWordText(word)}</span>
        {showSpeak && <SpeakButton word={word} compact />}
      </span>
    );
  }

  return (
    <div className="english-word-cell">
      <span className="cell-revealed">{renderWordText(word)}</span>
      {showSpeak && <SpeakButton word={word} />}
    </div>
  );
}
