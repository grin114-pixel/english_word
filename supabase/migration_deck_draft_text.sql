-- 편집창 줄바꿈(구분용 빈 줄) 유지용 원본 텍스트
alter table public.decks add column if not exists word_draft_text text;
alter table public.decks add column if not exists sentence_draft_text text;
