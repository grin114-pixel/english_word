-- migration_sentences.sql 실행 후, 기존 words 테이블의 문장 컬럼 제거
-- Supabase SQL Editor에서 실행하세요.

alter table public.words drop column if exists sentence;
alter table public.words drop column if exists is_wrong_sentence;
