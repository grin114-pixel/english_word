import type { Word } from '../types';
import { getDisplayWordPair } from '../utils/wordsToBulkText';
import { SpeakButton } from './EnglishWordCell';

interface StudyListProps {
  words: Word[];
}

export function StudyList({ words }: StudyListProps) {
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
            return (
            <tr key={word.id}>
              <td className="col-speak">
                <SpeakButton word={display.word} compact />
              </td>
              <td className="cell-revealed col-word">{display.word}</td>
              <td className="col-meaning">{display.meaning}</td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
