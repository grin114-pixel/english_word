import { supabase } from '../lib/supabase';
import type { Deck } from '../types';

export interface DeckDraftInput {
  title?: string;
  wordDraftText?: string;
  sentenceDraftText?: string;
}

export async function fetchDecks(): Promise<Deck[]> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchDeck(deckId: string): Promise<Deck | null> {
  const { data, error } = await supabase
    .from('decks')
    .select('*')
    .eq('id', deckId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createDeck(
  title: string,
  draft?: { wordDraftText?: string; sentenceDraftText?: string },
): Promise<Deck> {
  const { data, error } = await supabase
    .from('decks')
    .insert({
      title,
      word_draft_text: draft?.wordDraftText ?? null,
      sentence_draft_text: draft?.sentenceDraftText ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDeck(deckId: string): Promise<void> {
  const { error } = await supabase.from('decks').delete().eq('id', deckId);
  if (error) throw error;
}

export async function updateDeck(deckId: string, input: DeckDraftInput): Promise<void> {
  const payload: Record<string, string> = {};

  if (input.title !== undefined) payload.title = input.title;
  if (input.wordDraftText !== undefined) payload.word_draft_text = input.wordDraftText;
  if (input.sentenceDraftText !== undefined) payload.sentence_draft_text = input.sentenceDraftText;

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from('decks').update(payload).eq('id', deckId);
  if (error) throw error;
}

/** @deprecated updateDeck 사용 */
export async function updateDeckTitle(deckId: string, title: string): Promise<void> {
  await updateDeck(deckId, { title });
}
