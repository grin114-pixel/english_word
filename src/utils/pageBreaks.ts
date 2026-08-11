import type { Sentence, Word } from '../types';
import { getSentencePageBreakIndices } from './parseSentenceList';
import { getPageBreakIndices } from './parseWordList';
import { getSentenceIdsInDraftOrder } from './sentenceOrder';
import { getWordIdsInDraftOrder } from './wordOrder';

/** 편집 원본 텍스트 기준으로 페이지 구분선을 넣을 단어 ID 집합 */
export function getPageBreakWordIds(draftText: string | null | undefined, words: Word[]): Set<string> {
  if (!draftText?.trim() || words.length === 0) return new Set();

  const orderedIds = getWordIdsInDraftOrder(draftText, words);
  const breakIndices = new Set(getPageBreakIndices(draftText));

  const ids = new Set<string>();
  breakIndices.forEach((index) => {
    const id = orderedIds[index];
    if (id) ids.add(id);
  });
  return ids;
}

/** 편집 원본 텍스트 기준으로 페이지 구분선을 넣을 문장 ID 집합 */
export function getPageBreakSentenceIds(
  draftText: string | null | undefined,
  sentences: Sentence[],
): Set<string> {
  if (!draftText?.trim() || sentences.length === 0) return new Set();

  const orderedIds = getSentenceIdsInDraftOrder(draftText, sentences);
  const breakIndices = new Set(getSentencePageBreakIndices(draftText));

  const ids = new Set<string>();
  breakIndices.forEach((index) => {
    const id = orderedIds[index];
    if (id) ids.add(id);
  });
  return ids;
}
