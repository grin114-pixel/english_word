import { useEffect, useMemo, useState } from 'react';
import type { Sentence } from '../types';
import { splitSentenceByParentheses } from '../utils/maskParentheses';

interface SentenceTableProps {
  sentences: Sentence[];
  onToggleWrong: (sentence: Sentence) => void;
}

export function SentenceTable({ sentences, onToggleWrong }: SentenceTableProps) {
  return (
    <div className="word-table-wrap">
      <table className="word-table">
        <thead>
          <tr>
            <th className="col-check" aria-label="오답" />
            <th>문장</th>
          </tr>
        </thead>
        <tbody>
          {sentences.map((sentence) => (
            <SentenceRow key={sentence.id} sentence={sentence} onToggleWrong={onToggleWrong} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface SentenceRowProps {
  sentence: Sentence;
  onToggleWrong: (sentence: Sentence) => void;
}

function SentenceRow({ sentence, onToggleWrong }: SentenceRowProps) {
  return (
    <tr className={sentence.is_wrong ? 'is-wrong' : undefined}>
      <td className="col-check">
        <input
          type="checkbox"
          checked={sentence.is_wrong}
          onChange={() => onToggleWrong(sentence)}
          aria-label="문장 오답 표시"
        />
      </td>
      <td>
        <SentenceCell text={sentence.text} />
      </td>
    </tr>
  );
}

function SentenceCell({ text }: { text: string }) {
  const parts = useMemo(() => splitSentenceByParentheses(text), [text]);
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    setRevealed(new Set());
  }, [text]);

  let parenIndex = 0;

  return (
    <span className="sentence-cell">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={index}>{part.content}</span>;
        }

        const currentIndex = parenIndex;
        parenIndex += 1;
        const isRevealed = revealed.has(currentIndex);

        return (
          <span key={index}>
            (
            {isRevealed ? (
              <span className="cell-revealed">{part.inner}</span>
            ) : (
              <button
                type="button"
                className="blind-inline"
                onClick={() => setRevealed((prev) => new Set(prev).add(currentIndex))}
              >
                {'•'.repeat(Math.max(part.inner.length, 3))}
              </button>
            )}
            )
          </span>
        );
      })}
    </span>
  );
}
