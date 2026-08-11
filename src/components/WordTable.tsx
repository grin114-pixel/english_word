import { useEffect, useState } from 'react';
import type { ViewMode, Word } from '../types';
import { playPronunciation } from '../utils/pronunciation';
import { isWrongForMode } from '../utils/wrongByMode';
import { getDisplayWordPair } from '../utils/wordsToBulkText';
import { GrayText, plainTextForSpeech } from './GrayText';
import { EnglishWordCell } from './EnglishWordCell';

type WordTestMode = Exclude<ViewMode, 'study' | 'sentence'>;

interface WordTableProps {
  words: Word[];
  mode: WordTestMode;
  onToggleWrong: (word: Word) => void;
  pageBreakAfterWordIds?: Set<string>;
}

export function WordTable({ words, mode, onToggleWrong, pageBreakAfterWordIds }: WordTableProps) {
  const headers =
    mode === 'word'
      ? [
          { label: '뜻', className: 'col-meaning' },
          { label: '단어', className: 'col-word' },
        ]
      : [
          { label: '단어', className: 'col-word' },
          { label: '뜻', className: 'col-meaning' },
        ];

  return (
    <div className="word-table-wrap">
      <table className="word-table">
        <thead>
          <tr>
            <th className="col-check" aria-label="오답" />
            {headers.map((header) => (
              <th key={header.label} className={header.className}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {words.map((word) => (
            <WordRow
              key={word.id}
              word={word}
              mode={mode}
              onToggleWrong={onToggleWrong}
              pageBreakAfter={pageBreakAfterWordIds?.has(word.id) ?? false}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface WordRowProps {
  word: Word;
  mode: WordTestMode;
  onToggleWrong: (word: Word) => void;
  pageBreakAfter: boolean;
}

function WordRow({ word, mode, onToggleWrong, pageBreakAfter }: WordRowProps) {
  const [revealed, setRevealed] = useState(false);
  const isWrong = isWrongForMode(word, mode);
  const display = getDisplayWordPair(word);

  useEffect(() => {
    setRevealed(false);
  }, [mode, word.id]);

  const handleReveal = () => {
    setRevealed(true);
    void playPronunciation(plainTextForSpeech(display.word));
  };

  return (
    <tr
      className={[isWrong ? 'is-wrong' : '', pageBreakAfter ? 'page-break-after' : '']
        .filter(Boolean)
        .join(' ') || undefined}
    >
      <td className="col-check">
        <input
          type="checkbox"
          checked={isWrong}
          onChange={() => onToggleWrong(word)}
          aria-label={`${display.word} 오답 표시`}
        />
      </td>

      {mode === 'word' && (
        <>
          <td className="col-meaning">
            <GrayText text={display.meaning} />
          </td>
          <td className="col-word">
            <EnglishWordCell
              word={display.word}
              blind
              revealed={revealed}
              onReveal={handleReveal}
              compact
              showSpeak={false}
            />
          </td>
        </>
      )}

      {mode === 'meaning' && (
        <>
          <td className="col-word">
            <EnglishWordCell word={display.word} compact showSpeak={false} />
          </td>
          <td className="col-meaning">
            <BlindCell text={display.meaning} revealed={revealed} onReveal={handleReveal} />
          </td>
        </>
      )}
    </tr>
  );
}

function BlindCell({
  text,
  revealed,
  onReveal,
}: {
  text: string;
  revealed: boolean;
  onReveal: () => void;
}) {
  if (revealed) {
    return (
      <span className="cell-revealed">
        <GrayText text={text} />
      </span>
    );
  }
  return (
    <button type="button" className="blind-inline" onClick={onReveal}>
      •••
    </button>
  );
}
