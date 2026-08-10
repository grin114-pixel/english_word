import { supabase } from '../lib/supabase';
import type { Word } from '../types';
import { normalizeStoredWordPair } from '../utils/parseWordList';
import type { WordTestMode } from '../utils/wrongByMode';
import { wrongFieldForMode } from '../utils/wrongByMode';

function repairWordIfNeeded(word: Word): Word {
  const normalized = normalizeStoredWordPair(word.word, word.meaning);
  if (normalized.word === word.word && normalized.meaning === word.meaning) {
    return word;
  }

  void updateWord(word.id, normalized);
  return { ...word, word: normalized.word, meaning: normalized.meaning };
}

export async function fetchWords(deckId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('id, deck_id, user_id, word, meaning, is_wrong_word, is_wrong_meaning, created_at')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(repairWordIfNeeded);
}

export interface NewWordInput {
  deckId: string;
  word: string;
  meaning: string;
}

export async function createWord({ deckId, word, meaning }: NewWordInput): Promise<Word> {
  const { data, error } = await supabase
    .from('words')
    .insert({
      deck_id: deckId,
      word: word.trim(),
      meaning: meaning.trim(),
    })
    .select('id, deck_id, user_id, word, meaning, is_wrong_word, is_wrong_meaning, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function createWords(
  deckId: string,
  words: { word: string; meaning: string }[],
): Promise<Word[]> {
  if (words.length === 0) return [];

  const rows = words.map(({ word, meaning }) => ({
    deck_id: deckId,
    word: word.trim(),
    meaning: meaning.trim(),
  }));

  const { data, error } = await supabase
    .from('words')
    .insert(rows)
    .select('id, deck_id, user_id, word, meaning, is_wrong_word, is_wrong_meaning, created_at');

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

/** 기존 단어 목록과 수정된 목록을 줄 순서 기준으로 맞춰 동기화한다. */
export async function syncDeckWords(
  deckId: string,
  existingWords: Word[],
  newWords: { word: string; meaning: string }[],
): Promise<Word[]> {
  const result: Word[] = [];
  const maxLen = Math.max(existingWords.length, newWords.length);

  for (let i = 0; i < maxLen; i++) {
    const existing = existingWords[i];
    const incoming = newWords[i];

    if (existing && incoming) {
      await updateWord(existing.id, incoming);
      result.push({
        ...existing,
        word: incoming.word.trim(),
        meaning: incoming.meaning.trim(),
      });
    } else if (existing && !incoming) {
      await deleteWord(existing.id);
    } else if (!existing && incoming) {
      const created = await createWord({ deckId, ...incoming });
      result.push(created);
    }
  }

  return result;
}

export async function setWordWrong(wordId: string, mode: WordTestMode, isWrong: boolean): Promise<void> {
  const field = wrongFieldForMode(mode);
  const { error } = await supabase.from('words').update({ [field]: isWrong }).eq('id', wordId);
  if (error) throw error;
}
