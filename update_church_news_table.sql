-- church_news 테이블 id 컬럼을 TEXT로 변경하여 'singleton' 사용 가능하도록 수정

-- 기존 테이블 삭제 (데이터가 있다면 백업 후 실행)
DROP TABLE IF EXISTS church_news;

-- 새 테이블 생성
CREATE TABLE church_news (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  news JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 비활성화 (관리자만 사용하므로)
ALTER TABLE church_news DISABLE ROW LEVEL SECURITY;