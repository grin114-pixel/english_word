import { supabase } from '../lib/supabase';
import type { Sentence } from '../types';
import type { ParsedSentence } from '../utils/parseSentenceList';

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01' || (error.message?.includes('sentences') ?? false);
}

async function fetchLegacySentencesFromWords(
  deckId: string,
): Promise<{ text: string; meaning: string; is_wrong: boolean }[]> {
  const { data, error } = await supabase
    .from('words')
    .select('sentence, is_wrong_sentence')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (error) {
    const fallback = await supabase
      .from('words')
      .select('sentence')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });

    if (fallback.error) return [];
    return (fallback.data ?? [])
      .map((row) => row.sentence?.trim())
      .filter((text): text is string => Boolean(text))
      .map((text) => ({ text, meaning: '', is_wrong: false }));
  }

  return (data ?? [])
    .filter((row) => row.sentence?.trim())
    .map((row) => ({
      text: row.sentence!.trim(),
      meaning: '',
      is_wrong: row.is_wrong_sentence ?? false,
    }));
}

async function getNextSortOrder(deckId: string): Promise<number> {
  const { data, error } = await supabase
    .from('sentences')
    .select('sort_order')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.sort_order ?? -1) + 1;
}

async function deleteSentences(sentenceIds: string[]): Promise<void> {
  const ids = sentenceIds.filter((id) => !id.startsWith('legacy-'));
  if (ids.length === 0) return;
  const { error } = await supabase.from('sentences').delete().in('id', ids);
  if (error) throw error;
}

async function updateSentenceWithSortOrder(
  sentenceId: string,
  data: { text: string; meaning: string },
  sortOrder: number,
): Promise<void> {
  if (sentenceId.startsWith('legacy-')) return;
  const { error } = await supabase
    .from('sentences')
    .update({
      text: data.text.trim(),
      meaning: data.meaning.trim(),
      sort_order: sortOrder,
    })
    .eq('id', sentenceId);
  if (error) throw error;
}

async function updateSentenceSortOrder(sentenceId: string, sortOrder: number): Promise<void> {
  if (sentenceId.startsWith('legacy-')) return;
  const { error } = await supabase.from('sentences').update({ sort_order: sortOrder }).eq('id', sentenceId);
  if (error) throw error;
}

async function insertSentencesAtOrders(
  deckId: string,
  items: { text: string; meaning: string; sortOrder: number }[],
): Promise<Sentence[]> {
  if (items.length === 0) return [];

  const rows = items.map(({ text, meaning, sortOrder }) => ({
    deck_id: deckId,
    text: text.trim(),
    meaning: meaning.trim(),
    is_wrong: false,
    sort_order: sortOrder,
  }));

  const { data, error } = await supabase.from('sentences').insert(rows).select('*');
  if (error) throw error;
  return (data ?? []).map(normalizeSentence);
}

async function insertSentences(
  deckId: string,
  items: { text: string; meaning?: string; is_wrong?: boolean }[],
  startOrder = 0,
): Promise<Sentence[]> {
  if (items.length === 0) return [];

  const rows = items.map(({ text, meaning, is_wrong }, index) => ({
    deck_id: deckId,
    text: text.trim(),
    meaning: (meaning ?? '').trim(),
    is_wrong: is_wrong ?? false,
    sort_order: startOrder + index,
  }));

  const { data, error } = await supabase.from('sentences').insert(rows).select('*');
  if (error) throw error;
  return (data ?? []).map(normalizeSentence);
}

function normalizeSentence(row: Sentence): Sentence {
  return { ...row, meaning: row.meaning ?? '' };
}

export async function fetchSentences(deckId: string): Promise<Sentence[]> {
  const { data, error } = await supabase
    .from('sentences')
    .select('*')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (!error && data && data.length > 0) {
    return data.map(normalizeSentence);
  }

  const legacy = await fetchLegacySentencesFromWords(deckId);
  if (legacy.length === 0) {
    if (error && !isMissingTableError(error)) throw error;
    return [];
  }

  if (!error) {
    try {
      return await insertSentences(deckId, legacy);
    } catch {
      // sentences 테이블은 있지만 insert 실패 — 아래 임시 표시로 폴백
    }
  }

  return legacy.map((item, index) => ({
    id: `legacy-${deckId}-${index}`,
    deck_id: deckId,
    user_id: null,
    text: item.text,
    meaning: item.meaning,
    is_wrong: item.is_wrong,
    sort_order: index,
    created_at: new Date().toISOString(),
  }));
}

export async function createSentences(deckId: string, sentences: ParsedSentence[]): Promise<Sentence[]> {
  const startOrder = await getNextSortOrder(deckId);
  return insertSentences(deckId, sentences, startOrder);
}

export async function deleteSentence(sentenceId: string): Promise<void> {
  if (sentenceId.startsWith('legacy-')) return;
  const { error } = await supabase.from('sentences').delete().eq('id', sentenceId);
  if (error) throw error;
}

export async function setSentenceWrong(sentenceId: string, isWrong: boolean): Promise<void> {
  if (sentenceId.startsWith('legacy-')) return;
  const { error } = await supabase.from('sentences').update({ is_wrong: isWrong }).eq('id', sentenceId);
  if (error) throw error;
}

export async function reorderSentences(_deckId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds
      .filter((id) => !id.startsWith('legacy-'))
      .map((sentenceId, index) => updateSentenceSortOrder(sentenceId, index)),
  );
}

/** 기존 문장 목록과 수정된 목록을 줄 순서 기준으로 맞춰 동기화한다. */
export async function syncDeckSentences(
  deckId: string,
  existingSentences: Sentence[],
  newSentences: ParsedSentence[],
): Promise<Sentence[]> {
  const persisted = existingSentences.filter((s) => !s.id.startsWith('legacy-'));
  const hasLegacy = existingSentences.some((s) => s.id.startsWith('legacy-'));

  if (hasLegacy && persisted.length === 0 && newSentences.length > 0) {
    try {
      return await insertSentences(deckId, newSentences);
    } catch {
      // legacy 마이그레이션 실패 — 아래 일반 동기화로 진행
    }
  }

  const result: Sentence[] = new Array(newSentences.length);
  const updateTasks: Promise<void>[] = [];
  const deleteIds: string[] = [];
  const createItems: { text: string; meaning: string; sortOrder: number }[] = [];

  for (let i = newSentences.length; i < persisted.length; i++) {
    deleteIds.push(persisted[i].id);
  }

  for (let i = 0; i < newSentences.length; i++) {
    const incoming = {
      text: newSentences[i].text.trim(),
      meaning: newSentences[i].meaning.trim(),
    };
    const existing = persisted[i];

    if (existing) {
      result[i] = { ...existing, ...incoming, sort_order: i };
      if (
        existing.text !== incoming.text ||
        (existing.meaning ?? '') !== incoming.meaning ||
        existing.sort_order !== i
      ) {
        updateTasks.push(updateSentenceWithSortOrder(existing.id, incoming, i));
      }
    } else {
      createItems.push({ ...incoming, sortOrder: i });
    }
  }

  const syncTasks: Promise<unknown>[] = [...updateTasks];
  if (deleteIds.length > 0) syncTasks.push(deleteSentences(deleteIds));
  if (createItems.length > 0) {
    syncTasks.push(
      insertSentencesAtOrders(deckId, createItems).then((created) => {
        for (const item of created) {
          result[item.sort_order] = item;
        }
      }),
    );
  }

  await Promise.all(syncTasks);
  return result;
}
