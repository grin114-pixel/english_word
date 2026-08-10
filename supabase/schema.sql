-- 단어 암기장 앱 Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 실행하세요.

-- 1) 카드(덱) 테이블: 여러 단어를 담는 묶음
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

-- 2) 단어 테이블: 단어 / 뜻 / 오답 여부
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  word text not null,
  meaning text not null,
  is_wrong_word boolean not null default false,
  is_wrong_meaning boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3) 문장 테이블: 단어와 별도로 관리
create table if not exists public.sentences (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text text not null,
  is_wrong boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists words_deck_id_idx on public.words (deck_id);
create index if not exists sentences_deck_id_idx on public.sentences (deck_id);
create index if not exists decks_user_id_idx on public.decks (user_id);
create index if not exists words_user_id_idx on public.words (user_id);
create index if not exists sentences_user_id_idx on public.sentences (user_id);

-- 4) 행 수준 보안(RLS) 활성화
alter table public.decks enable row level security;
alter table public.words enable row level security;
alter table public.sentences enable row level security;

-- 5) 정책: 로그인(익명 로그인 포함)한 사용자는 자기 데이터만 조회/생성/수정/삭제 가능
drop policy if exists "decks_select_own" on public.decks;
create policy "decks_select_own" on public.decks
  for select using (auth.uid() = user_id);

drop policy if exists "decks_insert_own" on public.decks;
create policy "decks_insert_own" on public.decks
  for insert with check (auth.uid() = user_id);

drop policy if exists "decks_update_own" on public.decks;
create policy "decks_update_own" on public.decks
  for update using (auth.uid() = user_id);

drop policy if exists "decks_delete_own" on public.decks;
create policy "decks_delete_own" on public.decks
  for delete using (auth.uid() = user_id);

drop policy if exists "words_select_own" on public.words;
create policy "words_select_own" on public.words
  for select using (auth.uid() = user_id);

drop policy if exists "words_insert_own" on public.words;
create policy "words_insert_own" on public.words
  for insert with check (auth.uid() = user_id);

drop policy if exists "words_update_own" on public.words;
create policy "words_update_own" on public.words
  for update using (auth.uid() = user_id);

drop policy if exists "words_delete_own" on public.words;
create policy "words_delete_own" on public.words
  for delete using (auth.uid() = user_id);

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
