import { useEffect } from 'react';
import type { Word } from '../types';
import { prefetchPronunciations } from '../utils/pronunciation';
import { getDisplayWordPair } from '../utils/wordsToBulkText';
import { GrayText, plainTextForSpeech } from './GrayText';
import { SpeakButton } from './EnglishWordCell';

interface StudyListProps {
  words: Word[];
  pageBreakAfterWordIds?: Set<string>;
}

export function StudyList({ words, pageBreakAfterWordIds }: StudyListProps) {
  useEffect(() => {
    prefetchPronunciations(words.map((word) => plainTextForSpeech(getDisplayWordPair(word).word)));
  }, [words]);

  return (
    <div className="word-table-wrap">
      <table className="word-table">
        <thead>
          <tr>
            <th className="col-speak" aria-label="발음" />
            <th className="col-word">단어</th>
            <th className="col-meaning">뜻</th>
          </tr>
        </thead>
        <tbody>
          {words.map((word) => {
            const display = getDisplayWordPair(word);
            const pageBreakAfter = pageBreakAfterWordIds?.has(word.id) ?? false;
            return (
              <tr
                key={word.id}
                className={pageBreakAfter ? 'page-break-after' : undefined}
              >
                <td className="col-speak">
                  <SpeakButton word={plainTextForSpeech(display.word)} compact />
                </td>
                <td className="cell-revealed col-word">
                  <GrayText text={display.word} />
                </td>
                <td className="col-meaning">
                  <GrayText text={display.meaning} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
