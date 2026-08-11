import type { Word } from '../types';
import { hasGrayMarkers, normalizeGrayWordPair, stripGrayMarkers } from './grayText';
import { normalizeStoredWordPair, parseWordEntries } from './parseWordList';

function wordPairKey(word: string, meaning: string): string {
  const w = stripGrayMarkers(word).replace(/\s+/g, ' ').trim();
  const m = stripGrayMarkers(meaning).replace(/\s+/g, ' ').trim();
  return `${w}\0${m}`;
}

/** 잘못 나뉜 단어/뜻(예: 괄호·괄호 안 한글)도 같은 키로 맞춘다. */
function normalizedWordPairKey(word: string, meaning: string): string {
  if (hasGrayMarkers(word) || hasGrayMarkers(meaning)) {
    const normalized = normalizeGrayWordPair(word, meaning);
    if (normalized) return wordPairKey(normalized.word, normalized.meaning);
  }

  const normalized = normalizeStoredWordPair(word, meaning);
  return wordPairKey(normalized.word, normalized.meaning);
}

/** 편집 원본(또는 sort_order) 기준 단어 ID 순서 */
export function getWordIdsInDraftOrder(
  draftText: string | null | undefined,
  words: Word[],
): string[] {
  if (words.length === 0) return [];

  const fallback = [...words].sort((a, b) => a.sort_order - b.sort_order).map((w) => w.id);
  if (!draftText?.trim()) return fallback;

  const parsed = parseWordEntries(draftText);
  if (parsed.items.length === 0) return fallback;

  const pools = new Map<string, Word[]>();
  for (const word of words) {
    const key = normalizedWordPairKey(word.word, word.meaning);
    const list = pools.get(key) ?? [];
    list.push(word);
    pools.set(key, list);
  }
  for (const list of pools.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  const used = new Set<string>();
  const ids: string[] = [];

  for (const item of parsed.items) {
    const key = normalizedWordPairKey(item.word, item.meaning);
    const pool = pools.get(key);
    const match = pool?.find((word) => !used.has(word.id));
    if (match) {
      ids.push(match.id);
      used.add(match.id);
    }
  }

  const remaining = [...words]
    .filter((word) => !used.has(word.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (remaining.length === 0) return ids;

  const merged: string[] = [];
  let remainingIndex = 0;

  for (const id of ids) {
    const current = words.find((word) => word.id === id);
    while (
      remainingIndex < remaining.length &&
      remaining[remainingIndex].sort_order < (current?.sort_order ?? Number.MAX_SAFE_INTEGER)
    ) {
      merged.push(remaining[remainingIndex].id);
      remainingIndex += 1;
    }
    merged.push(id);
  }

  while (remainingIndex < remaining.length) {
    merged.push(remaining[remainingIndex].id);
    remainingIndex += 1;
  }

  return merged.length > 0 ? merged : fallback;
}
