-- 간단한 Storage RLS 정책
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. 기존 정책 모두 삭제
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON storage.objects;

-- 2. 모든 작업 허용 (개발/테스트용)
DROP POLICY IF EXISTS "Allow all operations" ON storage.objects;
CREATE POLICY "Allow all operations" ON storage.objects
FOR ALL USING (true);

-- 3. 버킷이 public인지 확인
UPDATE storage.buckets SET public = true WHERE id = 'menu-images';

-- 4. 확인 메시지
SELECT 'Simple storage policies applied successfully!' as message; 