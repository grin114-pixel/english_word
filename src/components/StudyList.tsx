import type { Word } from '../types';
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
          {words.map((word) => (
            <tr key={word.id}>
              <td className="col-speak">
                <SpeakButton word={word.word} compact />
              </td>
              <td className="cell-revealed col-word">{word.word}</td>
              <td className="col-meaning">{word.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
