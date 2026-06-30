-- ============================================================
-- 기존 발급 쿠폰 일괄 활성화 (1회용 데이터 보정)
-- - 아직 사용되지 않은(used_at IS NULL) 쿠폰만 활성화한다.
-- - 이미 사용된 쿠폰(used_at 존재)은 재사용 방지를 위해 그대로 둔다.
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1) 먼저 영향받을 쿠폰을 확인 (선택)
SELECT id, discount_percent, target_type, target_user_id, target_church_group,
       is_active, used_at, created_at
FROM public.coupons
WHERE is_active = false
  AND used_at IS NULL
ORDER BY created_at DESC;

-- 2) 미사용 비활성 쿠폰을 활성화
UPDATE public.coupons
SET is_active = true
WHERE is_active = false
  AND used_at IS NULL;
