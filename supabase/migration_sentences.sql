-- 문장을 단어와 분리: sentences 테이블 추가 + 기존 word.sentence 데이터 이전
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.sentences (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  is_wrong boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists sentences_deck_id_idx on public.sentences (deck_id);
create index if not exists sentences_user_id_idx on public.sentences (user_id);

alter table public.sentences enable row level security;

drop policy if exists "sentences_select_own" on public.sentences;
create policy "sentences_select_own" on public.sentences
  for select using (auth.uid() = user_id);

drop policy if exists "sentences_insert_own" on public.sentences;
create policy "sentences_insert_own" on public.sentences
  for insert with check (auth.uid() = user_id);

drop policy if exists "sentences_update_own" on public.sentences;
create policy "sentences_update_own" on public.sentences
  for update using (auth.uid() = user_id);

drop policy if exists "sentences_delete_own" on public.sentences;
create policy "sentences_delete_own" on public.sentences
  for delete using (auth.uid() = user_id);

-- 기존 words.sentence 값을 sentences 테이블로 이전
insert into public.sentences (deck_id, user_id, text, is_wrong, created_at)
select
  w.deck_id,
  w.user_id,
  trim(w.sentence),
  coalesce(w.is_wrong_sentence, false),
  w.created_at
from public.words w
where w.sentence is not null
  and trim(w.sentence) <> ''
  and not exists (
    select 1 from public.sentences s
    where s.deck_id = w.deck_id and s.text = trim(w.sentence)
  );
