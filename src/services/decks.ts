import { supabase } from '../lib/supabase';
import type { Deck } from '../types';

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

export async function createDeck(title: string): Promise<Deck> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인 세션이 없습니다.');

  const { data, error } = await supabase
    .from('decks')
    .insert({ title, user_id: user.id })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDeck(deckId: string): Promise<void> {
  const { error } = await supabase.from('decks').delete().eq('id', deckId);
  if (error) throw error;
}

export async function updateDeckTitle(deckId: string, title: string): Promise<void> {
  const { error } = await supabase.from('decks').update({ title }).eq('id', deckId);
  if (error) throw error;
}
