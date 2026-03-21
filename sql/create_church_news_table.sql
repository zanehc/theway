-- 교회소식 관리 테이블
create table if not exists church_news (
  id uuid primary key default gen_random_uuid(),
  news jsonb not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 최신 소식 1건만 사용한다면, news row는 1개만 유지해도 됨 