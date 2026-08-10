import type { Word } from '../types';
import { normalizeStoredWordPair } from './parseWordList';

/** 수정 화면에 보여줄 때 잘못 저장된 숙어도 다시 합쳐서 표시한다. */
export function wordsToBulkText(words: Word[]): string {
  return words
    .map((w) => {
      const { word, meaning } = normalizeStoredWordPair(w.word, w.meaning);
      return `${word} ${meaning}`;
    })
    .join('\n');
}

export function getDisplayWordPair(word: Word): { word: string; meaning: string } {
  return normalizeStoredWordPair(word.word, word.meaning);
}
