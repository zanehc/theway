-- ============================================================
-- Production RLS Fix
-- Supabase Dashboard > SQL Editor 에서 실행하세요
--
-- 목적
-- - users 정책의 자기 참조 재귀를 제거합니다.
-- - 일반 사용자가 role 값을 admin으로 승격하지 못하게 막습니다.
-- - 주문/주문항목은 본인 데이터만 생성/조회할 수 있게 제한합니다.
-- - 관리자 화면의 서버 API는 service role client를 사용하므로 RLS를 우회합니다.
-- ============================================================

BEGIN;

-- ── shared helpers ───────────────────────────────────────────
-- RLS 정책에서 users를 직접 다시 조회하면 재귀가 발생할 수 있으므로
-- 관리자 판별은 SECURITY DEFINER 함수로 분리합니다.
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = check_user_id
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO service_role;

-- 사용자가 직접 users.role을 admin 등으로 바꾸는 것을 방지합니다.
-- service role은 BYPASSRLS로 서버 관리 작업에 사용되며, 여기서는 일반 JWT 요청만 방어합니다.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND auth.uid() = NEW.id THEN
    IF TG_OP = 'INSERT' AND COALESCE(NEW.role, 'customer') <> 'customer' THEN
      RAISE EXCEPTION 'Users cannot assign their own role';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Users cannot change their own role';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_escalation ON public.users;
CREATE TRIGGER prevent_self_role_escalation
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_role_escalation();


-- ── users ────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;

CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND COALESCE(role, 'customer') = 'customer'
  );


-- ── orders ──────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

CREATE POLICY "Admins can update all orders" ON public.orders
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ── order_items ──────────────────────────────────────────────
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can update all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can update order items" ON public.order_items;

CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create order items" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders
      WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update all order items" ON public.order_items
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

COMMIT;
