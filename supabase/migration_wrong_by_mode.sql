-- 기존 DB에 모드별 오답 컬럼 추가 (이미 schema.sql을 실행한 경우 SQL Editor에서 실행)
alter table public.words add column if not exists is_wrong_word boolean not null default false;
alter table public.words add column if not exists is_wrong_meaning boolean not null default false;
alter table public.words add column if not exists is_wrong_sentence boolean not null default false;

-- 예전 is_wrong 값이 있으면 단어 탭 오답으로 이전
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'words' and column_name = 'is_wrong'
  ) then
    update public.words
    set is_wrong_word = is_wrong
    where is_wrong = true;
  end if;
end $$;
