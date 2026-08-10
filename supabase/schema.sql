-- 단어 암기장 앱 Supabase 스키마 (공용 / 로그인 없음)
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 실행하세요.

-- 1) 카드(덱) 테이블: 여러 단어를 담는 묶음
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  created_at timestamptz not null default now()
);

-- 2) 단어 테이블: 단어 / 뜻 / 오답 여부
create table if not exists public.words (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  user_id uuid,
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
  user_id uuid,
  text text not null,
  is_wrong boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists words_deck_id_idx on public.words (deck_id);
create index if not exists sentences_deck_id_idx on public.sentences (deck_id);
create index if not exists decks_user_id_idx on public.decks (user_id);
create index if not exists words_user_id_idx on public.words (user_id);
create index if not exists sentences_user_id_idx on public.sentences (user_id);

-- 4) 행 수준 보안(RLS) 활성화 + 공개 정책 (컴퓨터·휴대폰·배포 URL이 같은 데이터 공유)
alter table public.decks enable row level security;
alter table public.words enable row level security;
alter table public.sentences enable row level security;

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
