import type { Sentence } from '../types';
import { mergeSentenceRowsForDisplay, parseSentenceList } from './parseSentenceList';

function sentencePairKey(text: string, meaning: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  const m = meaning.replace(/\s+/g, ' ').trim();
  return `${t}\0${m}`;
}

/** 편집 원본(또는 sort_order) 기준 문장 ID 순서 */
export function getSentenceIdsInDraftOrder(
  draftText: string | null | undefined,
  sentences: Sentence[],
): string[] {
  if (sentences.length === 0) return [];

  const merged = mergeSentenceRowsForDisplay(sentences);
  const fallback = [...merged].sort((a, b) => a.sort_order - b.sort_order).map((s) => s.id);
  if (!draftText?.trim()) return fallback;

  const parsed = parseSentenceList(draftText);
  if (parsed.length === 0) return fallback;

  const pools = new Map<string, Sentence[]>();
  for (const sentence of merged) {
    const key = sentencePairKey(sentence.text, sentence.meaning ?? '');
    const list = pools.get(key) ?? [];
    list.push(sentence);
    pools.set(key, list);
  }
  for (const list of pools.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order);
  }

  const used = new Set<string>();
  const ids: string[] = [];

  for (const item of parsed) {
    const key = sentencePairKey(item.text, item.meaning);
    const pool = pools.get(key);
    const match = pool?.find((sentence) => !used.has(sentence.id));
    if (match) {
      ids.push(match.id);
      used.add(match.id);
    }
  }

  const remaining = [...merged]
    .filter((sentence) => !used.has(sentence.id))
    .sort((a, b) => a.sort_order - b.sort_order);
  ids.push(...remaining.map((sentence) => sentence.id));

  return ids.length > 0 ? ids : fallback;
}
