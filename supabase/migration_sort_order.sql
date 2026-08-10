-- 단어·문장 순서 저장용 sort_order 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

alter table public.words add column if not exists sort_order integer not null default 0;
alter table public.sentences add column if not exists sort_order integer not null default 0;

create index if not exists words_deck_sort_order_idx on public.words (deck_id, sort_order);
create index if not exists sentences_deck_sort_order_idx on public.sentences (deck_id, sort_order);

-- 기존 데이터: created_at 순서대로 sort_order 채우기
with ranked_words as (
  select
    id,
    row_number() over (partition by deck_id order by created_at asc) - 1 as next_order
  from public.words
)
update public.words w
set sort_order = ranked_words.next_order
from ranked_words
where w.id = ranked_words.id;

with ranked_sentences as (
  select
    id,
    row_number() over (partition by deck_id order by created_at asc) - 1 as next_order
  from public.sentences
)
update public.sentences s
set sort_order = ranked_sentences.next_order
from ranked_sentences
where s.id = ranked_sentences.id;
