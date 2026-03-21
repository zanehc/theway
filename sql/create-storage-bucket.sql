-- Supabase Storage 버킷 생성 스크립트
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. menu-images 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5MB 제한
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;

-- 3. 새로운 RLS 정책 설정

-- 모든 사용자가 이미지를 볼 수 있도록 설정
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'menu-images');

-- 인증된 사용자만 이미지를 업로드할 수 있도록 설정
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 인증된 사용자가 모든 이미지를 삭제할 수 있도록 설정
CREATE POLICY "Authenticated users can delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 인증된 사용자가 모든 이미지를 업데이트할 수 있도록 설정
CREATE POLICY "Authenticated users can update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 4. 확인 메시지
SELECT 'Storage bucket "menu-images" created successfully!' as message; 