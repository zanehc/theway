-- Storage RLS 정책 수정 스크립트
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

-- 2. 새로운 간단한 정책 설정

-- 모든 사용자가 읽기 가능 (이미지 표시용)
CREATE POLICY "Enable read access for all users" ON storage.objects
FOR SELECT USING (bucket_id = 'menu-images');

-- 인증된 사용자만 업로드 가능
CREATE POLICY "Enable insert for authenticated users only" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 인증된 사용자만 업데이트 가능
CREATE POLICY "Enable update for authenticated users only" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 인증된 사용자만 삭제 가능
CREATE POLICY "Enable delete for authenticated users only" ON storage.objects
FOR DELETE USING (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 3. 버킷이 public인지 확인
UPDATE storage.buckets 
SET public = true 
WHERE id = 'menu-images';

-- 4. 확인 메시지
SELECT 'Storage policies updated successfully!' as message; 