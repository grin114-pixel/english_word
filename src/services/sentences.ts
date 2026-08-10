import { supabase } from '../lib/supabase';
import type { Sentence } from '../types';

function isMissingTableError(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01' || (error.message?.includes('sentences') ?? false);
}

async function fetchLegacySentencesFromWords(
  deckId: string,
): Promise<{ text: string; is_wrong: boolean }[]> {
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
      .map((text) => ({ text, is_wrong: false }));
  }

  return (data ?? [])
    .filter((row) => row.sentence?.trim())
    .map((row) => ({
      text: row.sentence!.trim(),
      is_wrong: row.is_wrong_sentence ?? false,
    }));
}

async function insertSentences(
  deckId: string,
  items: { text: string; is_wrong?: boolean }[],
): Promise<Sentence[]> {
  if (items.length === 0) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인 세션이 없습니다.');

  const rows = items.map(({ text, is_wrong }) => ({
    deck_id: deckId,
    user_id: user.id,
    text: text.trim(),
    is_wrong: is_wrong ?? false,
  }));

  const { data, error } = await supabase.from('sentences').insert(rows).select('*');
  if (error) throw error;
  return data ?? [];
}

export async function fetchSentences(deckId: string): Promise<Sentence[]> {
  const { data, error } = await supabase
    .from('sentences')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (!error && data && data.length > 0) {
    return data;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return legacy.map((item, index) => ({
    id: `legacy-${deckId}-${index}`,
    deck_id: deckId,
    user_id: user?.id ?? '',
    text: item.text,
    is_wrong: item.is_wrong,
    created_at: new Date().toISOString(),
  }));
}

export async function createSentences(deckId: string, texts: string[]): Promise<Sentence[]> {
  return insertSentences(
    deckId,
    texts.map((text) => ({ text })),
  );
}

export async function deleteSentence(sentenceId: string): Promise<void> {
  if (sentenceId.startsWith('legacy-')) return;
  const { error } = await supabase.from('sentences').delete().eq('id', sentenceId);
  if (error) throw error;
}

export async function updateSentence(sentenceId: string, text: string): Promise<void> {
  if (sentenceId.startsWith('legacy-')) return;
  const { error } = await supabase.from('sentences').update({ text: text.trim() }).eq('id', sentenceId);
  if (error) throw error;
}

export async function setSentenceWrong(sentenceId: string, isWrong: boolean): Promise<void> {
  if (sentenceId.startsWith('legacy-')) return;
  const { error } = await supabase.from('sentences').update({ is_wrong: isWrong }).eq('id', sentenceId);
  if (error) throw error;
}

/** 기존 문장 목록과 수정된 목록을 줄 순서 기준으로 맞춰 동기화한다. */
export async function syncDeckSentences(
  deckId: string,
  existingSentences: Sentence[],
  newTexts: string[],
): Promise<Sentence[]> {
  const persisted = existingSentences.filter((s) => !s.id.startsWith('legacy-'));
  const hasLegacy = existingSentences.some((s) => s.id.startsWith('legacy-'));

  let base = persisted;
  if (hasLegacy && persisted.length === 0 && newTexts.length > 0) {
    try {
      base = await insertSentences(
        deckId,
        newTexts.map((text) => ({ text })),
      );
      return base;
    } catch {
      base = [];
    }
  }

  const result: Sentence[] = [];
  const maxLen = Math.max(base.length, newTexts.length);

  for (let i = 0; i < maxLen; i++) {
    const existing = base[i];
    const incoming = newTexts[i];

    if (existing && incoming) {
      await updateSentence(existing.id, incoming);
      result.push({ ...existing, text: incoming.trim() });
    } else if (existing && !incoming) {
      await deleteSentence(existing.id);
    } else if (!existing && incoming) {
      const created = await createSentences(deckId, [incoming]);
      result.push(created[0]);
    }
  }

  return result;
}
