-- church_news 테이블의 id 컬럼을 text 타입으로 변경
-- 기존 테이블이 있다면 삭제하고 새로 생성
DROP TABLE IF EXISTS church_news;

-- 교회소식 관리 테이블 (id를 text로 변경)
CREATE TABLE church_news (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  news JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 설정 (관리자만 접근 가능)
ALTER TABLE church_news ENABLE ROW LEVEL SECURITY;

-- 관리자만 읽기 가능
CREATE POLICY "Admins can read church_news" ON church_news
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 관리자만 쓰기 가능
CREATE POLICY "Admins can write church_news" ON church_news
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    ); 