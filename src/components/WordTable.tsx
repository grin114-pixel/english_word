import { useEffect, useState } from 'react';
import type { ViewMode, Word } from '../types';
import { isWrongForMode } from '../utils/wrongByMode';
import { EnglishWordCell } from './EnglishWordCell';

type WordTestMode = Exclude<ViewMode, 'study' | 'sentence'>;

interface WordTableProps {
  words: Word[];
  mode: WordTestMode;
  onToggleWrong: (word: Word) => void;
}

export function WordTable({ words, mode, onToggleWrong }: WordTableProps) {
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
            <WordRow key={word.id} word={word} mode={mode} onToggleWrong={onToggleWrong} />
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
}

function WordRow({ word, mode, onToggleWrong }: WordRowProps) {
  const [revealed, setRevealed] = useState(false);
  const isWrong = isWrongForMode(word, mode);

  useEffect(() => {
    setRevealed(false);
  }, [mode, word.id]);

  return (
    <tr className={isWrong ? 'is-wrong' : undefined}>
      <td className="col-check">
        <input
          type="checkbox"
          checked={isWrong}
          onChange={() => onToggleWrong(word)}
          aria-label={`${word.word} 오답 표시`}
        />
      </td>

      {mode === 'word' && (
        <>
          <td className="col-meaning">{word.meaning}</td>
          <td className="col-word">
            <EnglishWordCell
              word={word.word}
              blind
              revealed={revealed}
              onReveal={() => setRevealed(true)}
              compact
              showSpeak={false}
            />
          </td>
        </>
      )}

      {mode === 'meaning' && (
        <>
          <td className="col-word">
            <EnglishWordCell word={word.word} compact showSpeak={false} />
          </td>
          <td className="col-meaning">
            <BlindCell text={word.meaning} revealed={revealed} onReveal={() => setRevealed(true)} />
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
  if (revealed) return <span className="cell-revealed">{text}</span>;
  return (
    <button type="button" className="blind-inline" onClick={onReveal}>
      •••
    </button>
  );
}
