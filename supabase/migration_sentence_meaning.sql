-- 문장 해석(뜻) 컬럼 추가
alter table public.sentences add column if not exists meaning text not null default '';
