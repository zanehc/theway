-- church_news 테이블 RLS 비활성화 (임시)
ALTER TABLE church_news DISABLE ROW LEVEL SECURITY;

-- 또는 관리자만 접근 가능하도록 RLS 정책 설정
-- ALTER TABLE church_news ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Only admins can access church_news" ON church_news
--   FOR ALL USING (
--     EXISTS (
--       SELECT 1 FROM users 
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );