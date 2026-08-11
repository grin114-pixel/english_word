import { supabase } from '../lib/supabase';
import type { Word } from '../types';
import { normalizeStoredWordPair } from '../utils/parseWordList';
import { hasGrayMarkers, normalizeGrayWordPair } from '../utils/grayText';
import type { WordTestMode } from '../utils/wrongByMode';
import { wrongFieldForMode } from '../utils/wrongByMode';

const WORD_SELECT =
  'id, deck_id, user_id, word, meaning, is_wrong_word, is_wrong_meaning, sort_order, created_at';

function repairWordIfNeeded(word: Word): Word {
  if (hasGrayMarkers(word.word) || hasGrayMarkers(word.meaning)) {
    const reparsed = normalizeGrayWordPair(word.word, word.meaning);
    if (!reparsed) return word;

    if (reparsed.word === word.word && reparsed.meaning === word.meaning) {
      return word;
    }

    void updateWord(word.id, reparsed);
    return { ...word, word: reparsed.word, meaning: reparsed.meaning };
  }

  const normalized = normalizeStoredWordPair(word.word, word.meaning);
  if (normalized.word === word.word && normalized.meaning === word.meaning) {
    return word;
  }

  void updateWord(word.id, normalized);
  return { ...word, word: normalized.word, meaning: normalized.meaning };
}

async function getNextSortOrder(deckId: string): Promise<number> {
  const { data, error } = await supabase
    .from('words')
    .select('sort_order')
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.sort_order ?? -1) + 1;
}

export async function fetchWords(deckId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select(WORD_SELECT)
    .eq('deck_id', deckId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(repairWordIfNeeded);
}

export interface NewWordInput {
  deckId: string;
  word: string;
  meaning: string;
  sortOrder?: number;
}

export async function createWord({ deckId, word, meaning, sortOrder }: NewWordInput): Promise<Word> {
  const order = sortOrder ?? (await getNextSortOrder(deckId));

  const { data, error } = await supabase
    .from('words')
    .insert({
      deck_id: deckId,
      word: word.trim(),
      meaning: meaning.trim(),
      sort_order: order,
    })
    .select(WORD_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function createWords(
  deckId: string,
  words: { word: string; meaning: string }[],
): Promise<Word[]> {
  if (words.length === 0) return [];

  const startOrder = await getNextSortOrder(deckId);
  const rows = words.map(({ word, meaning }, index) => ({
    deck_id: deckId,
    word: word.trim(),
    meaning: meaning.trim(),
    sort_order: startOrder + index,
  }));

  const { data, error } = await supabase
    .from('words')
    .insert(rows)
    .select(WORD_SELECT);

  if (error) throw error;
  return data ?? [];
}

export async function deleteWord(wordId: string): Promise<void> {
  const { error } = await supabase.from('words').delete().eq('id', wordId);
  if (error) throw error;
}

export async function updateWord(
  wordId: string,
  data: { word: string; meaning: string },
): Promise<void> {
  const { error } = await supabase
    .from('words')
    .update({
      word: data.word.trim(),
      meaning: data.meaning.trim(),
    })
    .eq('id', wordId);

  if (error) throw error;
}

async function updateWordWithSortOrder(
  wordId: string,
  data: { word: string; meaning: string },
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from('words')
    .update({
      word: data.word.trim(),
      meaning: data.meaning.trim(),
      sort_order: sortOrder,
    })
    .eq('id', wordId);

  if (error) throw error;
}

async function updateWordSortOrder(wordId: string, sortOrder: number): Promise<void> {
  const { error } = await supabase.from('words').update({ sort_order: sortOrder }).eq('id', wordId);
  if (error) throw error;
}

async function deleteWords(wordIds: string[]): Promise<void> {
  if (wordIds.length === 0) return;
  const { error } = await supabase.from('words').delete().in('id', wordIds);
  if (error) throw error;
}

async function createWordsAtOrders(
  deckId: string,
  items: { word: string; meaning: string; sortOrder: number }[],
): Promise<Word[]> {
  if (items.length === 0) return [];

  const rows = items.map(({ word, meaning, sortOrder }) => ({
    deck_id: deckId,
    word: word.trim(),
    meaning: meaning.trim(),
    sort_order: sortOrder,
  }));

  const { data, error } = await supabase.from('words').insert(rows).select(WORD_SELECT);
  if (error) throw error;
  return data ?? [];
}

export async function reorderWords(_deckId: string, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((wordId, index) => updateWordSortOrder(wordId, index)),
  );
}

/** 기존 단어 목록과 수정된 목록을 줄 순서 기준으로 맞춰 동기화한다. */
export async function syncDeckWords(
  deckId: string,
  existingWords: Word[],
  newWords: { word: string; meaning: string }[],
): Promise<Word[]> {
  const result: Word[] = new Array(newWords.length);
  const updateTasks: Promise<void>[] = [];
  const deleteIds: string[] = [];
  const createItems: { word: string; meaning: string; sortOrder: number }[] = [];

  for (let i = newWords.length; i < existingWords.length; i++) {
    deleteIds.push(existingWords[i].id);
  }

  for (let i = 0; i < newWords.length; i++) {
    const incoming = newWords[i];
    const word = incoming.word.trim();
    const meaning = incoming.meaning.trim();
    const existing = existingWords[i];

    if (existing) {
      result[i] = { ...existing, word, meaning, sort_order: i };
      if (existing.word !== word || existing.meaning !== meaning || existing.sort_order !== i) {
        updateTasks.push(updateWordWithSortOrder(existing.id, { word, meaning }, i));
      }
    } else {
      createItems.push({ word, meaning, sortOrder: i });
    }
  }

  const syncTasks: Promise<unknown>[] = [...updateTasks];
  if (deleteIds.length > 0) syncTasks.push(deleteWords(deleteIds));
  if (createItems.length > 0) {
    syncTasks.push(
      createWordsAtOrders(deckId, createItems).then((created) => {
        for (const item of created) {
          result[item.sort_order] = item;
        }
      }),
    );
  }

  await Promise.all(syncTasks);
  return result;
}

export async function setWordWrong(wordId: string, mode: WordTestMode, isWrong: boolean): Promise<void> {
  const field = wrongFieldForMode(mode);
  const { error } = await supabase.from('words').update({ [field]: isWrong }).eq('id', wordId);
  if (error) throw error;
}
