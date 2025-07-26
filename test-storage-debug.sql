-- Supabase Storage 디버깅용 쿼리들

-- 1. menu-images 버킷이 존재하는지 확인
SELECT * FROM storage.buckets WHERE id = 'menu-images';

-- 2. menu-images 버킷의 모든 파일 목록
SELECT * FROM storage.objects WHERE bucket_id = 'menu-images';

-- 3. 아이스카페라떼 메뉴의 현재 상태 확인
SELECT id, name, image_url, updated_at 
FROM menus 
WHERE name LIKE '%아이스카페라떼%' OR name LIKE '%아이스%카페%라떼%';

-- 4. 모든 메뉴의 이미지 URL 상태
SELECT id, name, image_url, category
FROM menus 
ORDER BY updated_at DESC;