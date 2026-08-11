import type { Word } from '../types';
import { stripGrayMarkers } from './grayText';
import { parseWordEntries } from './parseWordList';
import { getDisplayWordPair } from './wordsToBulkText';

function wordPairKey(word: string, meaning: string): string {
  const w = stripGrayMarkers(word).replace(/\s+/g, ' ').trim();
  const m = stripGrayMarkers(meaning).replace(/\s+/g, ' ').trim();
  return `${w}\0${m}`;
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
    const display = getDisplayWordPair(word);
    const key = wordPairKey(display.word, display.meaning);
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
    const key = wordPairKey(item.word, item.meaning);
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
  ids.push(...remaining.map((word) => word.id));

  return ids.length > 0 ? ids : fallback;
}
