-- 로그인 없이 모든 기기에서 같은 데이터를 공유하도록 RLS를 공개 정책으로 변경
-- Supabase SQL Editor에서 이 파일 전체를 실행하세요.

-- user_id는 더 이상 필수가 아님 (기존 데이터 유지)
alter table public.decks alter column user_id drop not null;
alter table public.words alter column user_id drop not null;
alter table public.sentences alter column user_id drop not null;

alter table public.decks drop constraint if exists decks_user_id_fkey;
alter table public.words drop constraint if exists words_user_id_fkey;
alter table public.sentences drop constraint if exists sentences_user_id_fkey;

-- 기존 사용자별 정책 제거
drop policy if exists "decks_select_own" on public.decks;
drop policy if exists "decks_insert_own" on public.decks;
drop policy if exists "decks_update_own" on public.decks;
drop policy if exists "decks_delete_own" on public.decks;

drop policy if exists "words_select_own" on public.words;
drop policy if exists "words_insert_own" on public.words;
drop policy if exists "words_update_own" on public.words;
drop policy if exists "words_delete_own" on public.words;

drop policy if exists "sentences_select_own" on public.sentences;
drop policy if exists "sentences_insert_own" on public.sentences;
drop policy if exists "sentences_update_own" on public.sentences;
drop policy if exists "sentences_delete_own" on public.sentences;

-- 공개 정책: anon 키로 모든 기기가 같은 데이터 공유
drop policy if exists "decks_public_all" on public.decks;
create policy "decks_public_all" on public.decks
  for all
  using (true)
  with check (true);

drop policy if exists "words_public_all" on public.words;
create policy "words_public_all" on public.words
  for all
  using (true)
  with check (true);

drop policy if exists "sentences_public_all" on public.sentences;
create policy "sentences_public_all" on public.sentences
  for all
  using (true)
  with check (true);
