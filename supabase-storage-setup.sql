-- Supabase Storage 설정 스크립트
-- Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. menu-images 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'menu-images',
  'menu-images',
  true,
  5242880, -- 5MB 제한
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- 2. RLS 정책 설정

-- 모든 사용자가 이미지를 볼 수 있도록 설정
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'menu-images');

-- 인증된 사용자만 이미지를 업로드할 수 있도록 설정
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 인증된 사용자만 자신이 업로드한 이미지를 삭제할 수 있도록 설정
CREATE POLICY "Users can delete own uploads" ON storage.objects
FOR DELETE USING (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 인증된 사용자만 자신이 업로드한 이미지를 업데이트할 수 있도록 설정
CREATE POLICY "Users can update own uploads" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- 3. menus 테이블에 image_url 컬럼이 없다면 추가
-- (이미 있다면 이 부분은 건너뛰세요)
ALTER TABLE menus ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. 기존 메뉴에 대한 기본 이미지 URL 설정 (선택사항)
-- UPDATE menus SET image_url = NULL WHERE image_url IS NULL; 