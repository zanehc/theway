-- ============================================================
-- Coupons feature
-- - 회원별/목장별 쿠폰 발급 (할인율 5%~100%)
-- - 1회용 + 무기한
-- - 주문 시 쿠폰 적용 (orders.coupon_id / orders.discount_amount)
-- 관리자 발급/사용 처리는 서버(service role)에서 수행합니다.
-- ============================================================

BEGIN;

-- ── coupons ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_percent integer NOT NULL CHECK (discount_percent BETWEEN 5 AND 100),
  target_type text NOT NULL CHECK (target_type IN ('user', 'group')),
  target_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  target_church_group text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  used_at timestamptz,
  used_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  used_by_order_id uuid,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- 대상 유형에 맞는 컬럼이 채워졌는지 보장
  CONSTRAINT coupons_target_check CHECK (
    (target_type = 'user' AND target_user_id IS NOT NULL)
    OR (target_type = 'group' AND target_church_group IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS coupons_target_user_id_idx ON public.coupons (target_user_id);
CREATE INDEX IF NOT EXISTS coupons_target_church_group_idx ON public.coupons (target_church_group);
CREATE INDEX IF NOT EXISTS coupons_is_active_idx ON public.coupons (is_active);

-- ── orders: 쿠폰 적용 컬럼 ───────────────────────────────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- used_by_order_id FK는 orders 테이블 참조 (orders 생성 이후 추가)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_used_by_order_id_fkey'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_used_by_order_id_fkey
      FOREIGN KEY (used_by_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Users can view their coupons" ON public.coupons;

-- 관리자: 전체 관리 (service role은 BYPASSRLS, 이 정책은 일반 admin JWT 대비)
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 고객: 본인 또는 본인 목장 대상의 활성 쿠폰 조회
CREATE POLICY "Users can view their coupons" ON public.coupons
  FOR SELECT
  USING (
    is_active = true
    AND (
      target_user_id = auth.uid()
      OR target_church_group = (
        SELECT church_group FROM public.users WHERE id = auth.uid()
      )
    )
  );

COMMIT;
