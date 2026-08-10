import type { Word } from '../types';

/** 수정 화면에 보여줄 때는 탭 없이 공백으로 구분한다. */
export function wordsToBulkText(words: Word[]): string {
  return words.map((w) => `${w.word} ${w.meaning}`).join('\n');
}
