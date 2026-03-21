-- =====================================================
-- THE WAY 카페 - 데이터베이스 복원 스크립트
-- Supabase SQL Editor에서 실행하세요
-- =====================================================

-- 1. UUID Extension 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. 테이블 생성
-- =====================================================

-- Users 테이블
CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    role text NOT NULL,
    church_group text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    terms_service boolean DEFAULT false NOT NULL,
    terms_privacy boolean DEFAULT false NOT NULL,
    terms_location boolean DEFAULT false NOT NULL,
    terms_promo boolean DEFAULT false NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['customer'::text, 'staff'::text, 'admin'::text])))
);

-- Menus 테이블
CREATE TABLE IF NOT EXISTS public.menus (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    category text NOT NULL,
    image_url text,
    is_available boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT menus_price_check CHECK ((price >= (0)::numeric))
);

-- Orders 테이블
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    church_group text,
    total_amount numeric(10,2) NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_method text NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    cancellation_reason text,
    CONSTRAINT orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'transfer'::text]))),
    CONSTRAINT orders_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'confirmed'::text]))),
    CONSTRAINT orders_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT orders_total_amount_check CHECK ((total_amount >= (0)::numeric))
);

-- Order Items 테이블
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid DEFAULT uuid_generate_v4() NOT NULL PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_id uuid NOT NULL REFERENCES public.menus(id) ON DELETE RESTRICT,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_total_price_check CHECK ((total_price >= (0)::numeric)),
    CONSTRAINT order_items_unit_price_check CHECK ((unit_price >= (0)::numeric))
);

-- =====================================================
-- 3. 사용자 데이터 복원
-- =====================================================

INSERT INTO public.users (id, email, name, role, church_group, created_at, updated_at, terms_service, terms_privacy, terms_location, terms_promo) VALUES
('a99fd509-c409-4533-88b4-f68ddb92aa4f', 'admin@example.com', '관리자', 'admin', '관리자', '2025-07-05 09:27:46.749761+00', '2025-07-05 09:27:46.749761+00', false, false, false, false),
('0c239f31-e450-40d8-9099-19cf6a4b5948', 'admin@naver.com', '관리자', 'admin', '관리자', '2025-07-05 09:28:39.69702+00', '2025-07-05 09:28:39.69702+00', false, false, false, false),
('dd1e1309-7d06-42f9-85a5-410314cdb52d', 'chkomi95@gmail.com', '윤형창', 'customer', '할렐루야', '2025-07-05 23:10:16.729+00', '2025-07-05 23:10:16.842226+00', true, true, true, false),
('58371973-fb1c-45d4-9642-8f5fc79ebbdd', 'chkomi95@naver.com', '윤형창', 'customer', '할렐루야', '2025-07-05 23:40:07.719+00', '2025-07-05 23:40:07.814466+00', true, true, true, false),
('220e4dce-4c67-45b2-ab19-2c111693a967', 'test@example.com', '테스트 사용자', 'customer', '테스트 목장', '2025-07-05 23:47:23.35+00', '2025-07-05 23:47:23.419783+00', false, false, false, false),
('5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '594946634@qq.com', '왕소영', 'customer', '할렐루아', '2025-07-06 07:13:07.297+00', '2025-07-06 07:13:07.380305+00', true, true, true, false),
('9ba79151-a897-4a46-9673-c8d130432aef', 'chkomi@gmail.com', '윤형창', 'customer', '할렐루야', '2025-07-05 22:57:33.301516+00', '2025-07-05 22:57:33.301516+00', true, true, true, false),
('ca9876c2-efc2-41d5-b193-7a6d201309b5', 'xellosxg@naver.com', '윤형창', 'customer', '할렐루야', '2025-07-05 23:56:06.619+00', '2025-07-28 03:19:44.096354+00', true, true, true, false),
('fd3f2e52-fa42-447e-a0bb-7b53e98e7b23', 'harbin@kakao.com', '윤형창', 'customer', '할렐루야', '2025-07-28 03:29:53.842711+00', '2025-07-28 03:30:01.11997+00', false, false, false, false),
('80983310-dda3-4d9c-817a-ce80541aeaa7', 'kaiser2nd@naver.com', '김성범', 'customer', '할렐루야', '2025-08-09 06:24:55.564+00', '2025-08-09 06:24:55.722001+00', true, true, true, false);

-- =====================================================
-- 4. 메뉴 데이터 복원
-- =====================================================

INSERT INTO public.menus (id, name, description, price, category, image_url, is_available, created_at, updated_at) VALUES
('f9986316-8b22-427a-bef4-d09e2f0adb26', '따뜻한 바닐라 라떼', '바닐라 시럽이 들어간 부드러운 라떼', 3000.00, 'hot coffee', 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:42:09.630028+00'),
('5242b2cb-bd08-481c-ae70-0236fda16dd0', '아이스 바닐라 라떼', '바닐라 시럽이 들어간 부드러운 라떼', 3000.00, 'ice coffee', 'https://images.unsplash.com/photo-1561043433-9265f73e685f?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:42:19.105838+00'),
('7985af9a-00a8-4223-9436-349a60f0eb6d', '아이스 초코라떼', '진한 초콜릿과 우유', 3000.00, 'ice coffee', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:42:49.307033+00'),
('5dbe4704-dd4f-42f8-8bb6-435d8695a05b', '아이스 카라멜 마끼아또', '달콤한 카라멜과 에스프레소', 3000.00, 'ice coffee', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:58:40.931339+00'),
('256dc522-ef8d-4806-ae7d-14058b69e7af', '핫초코', '따뜻한 초코라떼', 2000.00, 'tea', 'https://images.unsplash.com/photo-1517578239113-b03992dcdd25?w=400&h=300&fit=crop', true, '2025-07-06 12:43:28.00394+00', '2025-07-06 12:43:54.74107+00'),
('63570009-827c-4231-9851-197c81ed3fe7', '따뜻한 아메리카노', '깔끔한 에스프레소와 물의 조화', 2000.00, 'hot coffee', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:35:44.743905+00'),
('0b5e3a50-a5c1-4300-bf21-ef2cbe4117e4', '따뜻한 카페라떼', '부드러운 우유와 에스프레소', 2500.00, 'hot coffee', 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:36:40.645396+00'),
('3789f932-02b1-4352-8f88-21ad68aee79c', '아이스 아메리카노', '깔끔한 에스프레소와 물의 조화', 2000.00, 'ice coffee', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:38:52.659693+00'),
('5bce0e15-6a97-4f2d-ac9a-710cf8fe879f', '레몬에이드', '상큼한 레몬과 탄산수', 3000.00, 'beverage', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:40:23.868043+00'),
('b10dd860-5cba-4ff3-b97b-debdc1b8d3a8', '유자에이드', '유자차 베이스 에이드', 3000.00, 'beverage', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:41:20.069373+00'),
('ed5e90f8-ddf1-44b7-bdeb-73c4bab33adf', '아이스 카푸치노', '에스프레소와 스팀밀크, 우유거품', 2500.00, 'ice coffee', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:44:31.6802+00'),
('eb39b278-bbcd-4aea-834d-62e4383e4411', '따뜻한 카푸치노', '에스프레소와 스팀밀크, 우유거품', 2500.00, 'hot coffee', 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:44:41.47381+00'),
('4f2aeeb0-b77f-4ce6-9fca-0737e8eed377', '따뜻한 카라멜 마끼아또', '달콤한 카라멜과 에스프레소', 3000.00, 'hot coffee', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-06 12:45:22.76046+00'),
('a6c24ea8-c0d2-4396-ba43-4a38f54ef0fe', '레몬차', '신선한 레몬의 상쾌한 맛', 2000.00, 'tea', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', true, '2025-07-05 11:32:38.773699+00', '2025-07-06 12:45:51.543212+00'),
('2d6338b3-335d-403b-98ff-041f4eca62ca', '유자차', '상큼하고 달콤한 유자차, 비타민C가 풍부', 2000.00, 'tea', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop', true, '2025-07-05 11:32:38.773699+00', '2025-07-06 12:46:08.285876+00'),
('39ee6f9b-349d-4d3d-832a-112c5b38c5bc', '아샷추', '아메리카노와 아이스티의 완벽한 조화', 2500.00, 'ice coffee', 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop', true, '2025-07-05 11:32:38.773699+00', '2025-07-06 12:46:30.427699+00'),
('c3b71ce3-3559-4987-892b-05430ec24c5e', '자몽에이드', '자몽청으로 만든 에이드', 3000.00, 'beverage', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop', true, '2025-07-26 22:17:29.925682+00', '2025-07-26 22:18:19.478307+00'),
('b8182df6-e271-4dfe-8726-52bbb30ccaf0', '오렌지에이드', '오렌지청 베이스 에이드', 3000.00, 'beverage', 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-26 23:03:28.531843+00'),
('475a787b-7261-48fd-8b3b-a2ef177cd8b2', '아이스 카페라떼', '부드러운 우유와 에스프레소', 2500.00, 'ice coffee', 'https://images.unsplash.com/photo-1561043433-9265f73e685f?w=400&h=300&fit=crop', true, '2025-07-04 22:30:17.496731+00', '2025-07-28 03:24:45.289262+00');

-- =====================================================
-- 5. 주문 데이터 복원
-- =====================================================

INSERT INTO public.orders (id, user_id, customer_name, church_group, total_amount, status, payment_method, payment_status, notes, created_at, updated_at, cancellation_reason) VALUES
('9a474b21-db47-46dd-a0ac-80475d141c42', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 9000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-28 11:47:39.273041+00', '2025-07-28 11:48:28.280905+00', NULL),
('dedc9179-b66e-45a8-8549-ecb3f5cc3071', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 9000.00, 'cancelled', 'transfer', 'pending', NULL, '2025-07-12 16:08:00.230985+00', '2025-07-12 16:33:27.578895+00', NULL),
('c2174d18-bb06-46aa-918a-ab8b3208acd9', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 11000.00, 'completed', 'transfer', 'pending', NULL, '2025-07-12 11:35:37.224958+00', '2025-07-13 13:00:45.865278+00', NULL),
('fb86ac39-3312-498d-b715-12438a7da35f', '80983310-dda3-4d9c-817a-ce80541aeaa7', '김성범', '할렐루야', 3000.00, 'ready', 'transfer', 'pending', NULL, '2025-08-09 06:25:25.641889+00', '2025-08-09 06:25:41.122647+00', NULL),
('4a9d02dd-bcff-4b85-8a26-bfef9573ec97', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 15000.00, 'ready', 'transfer', 'pending', NULL, '2025-07-25 08:39:24.012499+00', '2025-07-26 23:29:05.59069+00', NULL),
('e37ea606-bd3a-45b9-98fa-24f1ba31eb7a', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 11000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-26 23:01:23.740913+00', '2025-07-26 23:29:17.591974+00', NULL),
('1cd31584-c61e-469c-859f-2a958785857b', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 15000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-26 23:08:57.595174+00', '2025-07-26 23:29:21.680363+00', NULL),
('69960f13-c48f-4cf4-b4f9-a78d7aa009d6', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 11000.00, 'cancelled', 'transfer', 'confirmed', NULL, '2025-07-26 23:11:41.277346+00', '2025-07-26 23:29:48.978255+00', NULL),
('df06e002-a928-40d1-b537-ad401401d6d4', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 16500.00, 'cancelled', 'transfer', 'confirmed', NULL, '2025-07-26 23:11:53.047714+00', '2025-07-26 23:29:53.739081+00', NULL),
('e1365a83-e0a4-489f-9f81-204815799520', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 10000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-26 23:01:09.51172+00', '2025-07-26 23:30:17.953283+00', NULL),
('8e2a3160-451e-4817-b33b-5934231d938e', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 9500.00, 'cancelled', 'transfer', 'confirmed', NULL, '2025-07-26 23:11:25.296097+00', '2025-07-26 23:32:01.636528+00', NULL),
('031ddd01-455e-4724-a314-221dca6d34e5', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 12000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-25 09:23:46.099502+00', '2025-07-26 23:33:32.612122+00', NULL),
('9c3809fe-0de6-46b2-9990-73d05b18674f', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 4000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-12 16:30:15.307442+00', '2025-07-13 13:33:50.518192+00', NULL),
('ffcdfc1f-2dc1-4b14-8b0e-1fc534e8ca2c', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 20000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-28 03:36:28.523651+00', '2025-07-28 03:52:59.917645+00', NULL),
('cf23dd71-07e5-478c-98ea-2e42f696aca8', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 18000.00, 'cancelled', 'transfer', 'pending', NULL, '2025-07-12 16:17:11.153474+00', '2025-07-13 12:29:46.942541+00', NULL),
('ee58bcf9-9b5c-4a70-9495-1affdcbc7ddb', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 4000.00, 'cancelled', 'transfer', 'confirmed', NULL, '2025-07-12 16:18:28.232285+00', '2025-07-13 12:30:51.612114+00', NULL),
('6a19bdbb-8c2e-4e40-8f13-460689e57b96', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 9000.00, 'ready', 'transfer', 'pending', NULL, '2025-07-12 11:38:10.712926+00', '2025-07-13 12:30:58.462561+00', NULL),
('0de3dab6-289a-4d86-b920-6201d9cbd6f4', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 9000.00, 'ready', 'transfer', 'pending', NULL, '2025-07-12 11:37:46.496304+00', '2025-07-13 12:31:03.928946+00', NULL),
('7064ee0e-0445-4f6b-a155-838bcfa1966e', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 12000.00, 'preparing', 'transfer', 'pending', NULL, '2025-07-28 03:53:25.574257+00', '2025-07-28 04:03:40.262175+00', NULL),
('8aaadd3e-e78b-44a9-b4fc-e1d79efc7664', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 12000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-28 03:53:36.604027+00', '2025-07-28 04:06:01.551432+00', NULL),
('bd4fe3b6-1c5e-4c0b-8db2-1dc8c0f9a329', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 12000.00, 'completed', 'transfer', 'pending', NULL, '2025-07-25 08:32:30.96577+00', '2025-07-25 08:39:00.944291+00', NULL),
('f526c020-d0da-4e96-9223-cddec3f39c31', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 6000.00, 'completed', 'transfer', 'pending', NULL, '2025-07-25 08:31:57.636078+00', '2025-07-25 08:39:09.976473+00', NULL),
('ef8c6e81-3f5b-4604-ad33-e36c52a4b3fe', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 6000.00, 'ready', 'transfer', 'pending', NULL, '2025-07-28 03:53:12.916673+00', '2025-07-28 04:06:12.030247+00', NULL),
('ab0c7099-6fd0-41a3-82a1-7fc267129292', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 7500.00, 'pending', 'transfer', 'pending', NULL, '2025-07-28 04:06:46.460418+00', '2025-07-28 04:06:46.460418+00', NULL),
('1cbd3c79-40c8-4773-9290-c5ec560b676d', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 9000.00, 'pending', 'transfer', 'pending', NULL, '2025-07-28 04:07:01.090536+00', '2025-07-28 04:07:01.090536+00', NULL),
('0dcb4ca4-9337-4f8a-9dfc-cca45f093b5e', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 7500.00, 'preparing', 'transfer', 'pending', NULL, '2025-07-28 04:11:33.18065+00', '2025-07-28 04:11:41.450585+00', NULL),
('2b5932cf-7838-4f2b-8f20-918c371971c4', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 6000.00, 'pending', 'transfer', 'pending', NULL, '2025-07-28 06:19:44.097729+00', '2025-07-28 06:19:44.097729+00', NULL),
('1a9a7ace-8673-45cb-ad36-b445d694cf87', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 6000.00, 'pending', 'transfer', 'pending', NULL, '2025-07-28 06:20:05.120246+00', '2025-07-28 06:20:05.120246+00', NULL),
('0620e09b-aec7-40ae-bb69-022c08795b57', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 18000.00, 'ready', 'transfer', 'confirmed', NULL, '2025-07-25 08:39:38.091895+00', '2025-07-25 09:24:18.5691+00', NULL),
('193da423-1dae-49f8-9e87-411bdfc457d4', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 9000.00, 'preparing', 'transfer', 'pending', NULL, '2025-07-28 06:16:07.859412+00', '2025-07-28 06:20:15.544293+00', NULL),
('c7a3fe72-2a4b-4516-8bf7-8f4d4c6e18d9', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 18000.00, 'ready', 'transfer', 'pending', NULL, '2025-07-12 11:39:47.091692+00', '2025-07-12 15:58:17.36717+00', NULL),
('c89d2204-fab7-455f-9722-ee13a821003a', '5ba908ea-bd3e-4fe6-aff0-9e4b7a65c309', '왕소영', '할렐루아', 10500.00, 'ready', 'transfer', 'confirmed', NULL, '2025-07-26 09:07:35.903437+00', '2025-07-26 09:09:06.861499+00', NULL),
('58d6c9c0-e9f8-4955-83e4-f62a82be7caa', 'fd3f2e52-fa42-447e-a0bb-7b53e98e7b23', '윤형창', '할렐루야', 17000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-28 03:30:23.835419+00', '2025-07-28 07:00:05.107675+00', NULL),
('5f93cd45-a38f-44ef-b51c-d12d69e3280e', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 9000.00, 'completed', 'transfer', 'pending', NULL, '2025-07-12 11:48:33.702718+00', '2025-07-12 16:32:28.501469+00', NULL),
('d00cb479-edab-4213-8a02-75fc4932599a', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 18000.00, 'completed', 'transfer', 'pending', NULL, '2025-07-12 11:46:56.82613+00', '2025-07-12 16:33:11.161074+00', NULL),
('718719e9-8efd-4062-ace1-1e309f5820a0', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 9000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-28 10:54:46.834182+00', '2025-07-28 11:12:27.807784+00', NULL),
('c8a79c1d-1bd6-413e-90ee-2373a410d020', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 7500.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-28 11:07:01.192578+00', '2025-07-28 11:29:49.166289+00', NULL),
('3b642ebb-d10f-4abf-bf11-0abaca8bef12', 'ca9876c2-efc2-41d5-b193-7a6d201309b5', '윤형창', '할렐루야', 12000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-28 07:15:16.894393+00', '2025-07-28 11:30:01.277461+00', NULL),
('6b4e6299-99d3-49f3-a358-82f8a842357a', 'fd3f2e52-fa42-447e-a0bb-7b53e98e7b23', '윤형창', '할렐루야', 9000.00, 'ready', 'transfer', 'confirmed', NULL, '2025-07-28 07:00:30.993669+00', '2025-07-28 11:47:18.130448+00', NULL),
('8ca7f440-9ac0-403b-b66a-b97144864ccb', 'fd3f2e52-fa42-447e-a0bb-7b53e98e7b23', '윤형창', '할렐루야', 11000.00, 'completed', 'transfer', 'confirmed', NULL, '2025-07-28 07:00:43.18492+00', '2025-07-28 11:47:24.805235+00', NULL);

-- =====================================================
-- 6. 주문 항목 데이터 복원
-- =====================================================

INSERT INTO public.order_items (id, order_id, menu_id, quantity, unit_price, total_price, notes, created_at) VALUES
('391243b5-7b8a-4e3c-98dd-40903ece5fcc', 'c2174d18-bb06-46aa-918a-ab8b3208acd9', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 1, 3000.00, 3000.00, NULL, '2025-07-12 11:35:37.316886+00'),
('0aec7588-6d70-4808-8af7-57ae3091cea6', 'c2174d18-bb06-46aa-918a-ab8b3208acd9', '3789f932-02b1-4352-8f88-21ad68aee79c', 4, 2000.00, 8000.00, NULL, '2025-07-12 11:35:37.316886+00'),
('6cf19707-88d7-4150-86a7-c4631d7dbfe2', '0de3dab6-289a-4d86-b920-6201d9cbd6f4', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 3, 3000.00, 9000.00, NULL, '2025-07-12 11:37:46.562737+00'),
('0aba8dac-52b3-4d1c-9c56-e3479a4d2dd2', '6a19bdbb-8c2e-4e40-8f13-460689e57b96', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 3, 3000.00, 9000.00, NULL, '2025-07-12 11:38:10.76676+00'),
('60bc177f-7602-4ce9-b753-4f4bee177a3e', 'c7a3fe72-2a4b-4516-8bf7-8f4d4c6e18d9', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-12 11:39:47.13217+00'),
('bae5abad-37b4-41ab-95a0-c4b1f852e04a', 'c7a3fe72-2a4b-4516-8bf7-8f4d4c6e18d9', '5dbe4704-dd4f-42f8-8bb6-435d8695a05b', 2, 3000.00, 6000.00, NULL, '2025-07-12 11:39:47.13217+00'),
('ba3467f7-e628-4aa5-9158-aed8ba6bff88', 'd00cb479-edab-4213-8a02-75fc4932599a', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-12 11:46:56.890719+00'),
('9942482e-a4bd-4b5d-b68e-a038cda9a012', 'd00cb479-edab-4213-8a02-75fc4932599a', '5dbe4704-dd4f-42f8-8bb6-435d8695a05b', 2, 3000.00, 6000.00, NULL, '2025-07-12 11:46:56.890719+00'),
('4dd7b2ac-478e-430a-aebf-3d754d12b911', '5f93cd45-a38f-44ef-b51c-d12d69e3280e', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 3, 3000.00, 9000.00, NULL, '2025-07-12 11:48:33.764799+00'),
('875eee4a-dc5d-44fe-9ed6-f0e04c5a731f', 'dedc9179-b66e-45a8-8549-ecb3f5cc3071', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 3, 3000.00, 9000.00, NULL, '2025-07-12 16:08:00.324462+00'),
('88ca0fb2-b576-495e-abf8-a864bb609f9a', 'cf23dd71-07e5-478c-98ea-2e42f696aca8', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-12 16:17:11.199258+00'),
('669cc08c-21fe-448e-b037-447ff6edff5b', 'cf23dd71-07e5-478c-98ea-2e42f696aca8', '5dbe4704-dd4f-42f8-8bb6-435d8695a05b', 2, 3000.00, 6000.00, NULL, '2025-07-12 16:17:11.199258+00'),
('b777ce7f-16b7-4aab-a842-677500c902e3', 'ee58bcf9-9b5c-4a70-9495-1affdcbc7ddb', '3789f932-02b1-4352-8f88-21ad68aee79c', 2, 2000.00, 4000.00, NULL, '2025-07-12 16:18:28.274724+00'),
('a666cd0b-2407-48b7-973e-c59ffb4fd3e9', '9c3809fe-0de6-46b2-9990-73d05b18674f', '3789f932-02b1-4352-8f88-21ad68aee79c', 2, 2000.00, 4000.00, NULL, '2025-07-12 16:30:15.348192+00'),
('80253c10-7dd6-448c-bae8-7583328f219e', 'f526c020-d0da-4e96-9223-cddec3f39c31', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 2, 3000.00, 6000.00, NULL, '2025-07-25 08:31:57.70416+00'),
('a3edf6bf-f9ec-4a31-987e-c891bcf97018', 'bd4fe3b6-1c5e-4c0b-8db2-1dc8c0f9a329', '5dbe4704-dd4f-42f8-8bb6-435d8695a05b', 2, 3000.00, 6000.00, NULL, '2025-07-25 08:32:31.017024+00'),
('702faefa-2c39-4a64-ad3e-326fb42c09c1', 'bd4fe3b6-1c5e-4c0b-8db2-1dc8c0f9a329', '7985af9a-00a8-4223-9436-349a60f0eb6d', 2, 3000.00, 6000.00, NULL, '2025-07-25 08:32:31.017024+00'),
('a71616a4-b4c8-4dc3-873a-5851d7eaa0f5', '4a9d02dd-bcff-4b85-8a26-bfef9573ec97', '5dbe4704-dd4f-42f8-8bb6-435d8695a05b', 5, 3000.00, 15000.00, NULL, '2025-07-25 08:39:24.053742+00'),
('086426b8-d878-4921-8575-8b26adcd29d8', '0620e09b-aec7-40ae-bb69-022c08795b57', '5dbe4704-dd4f-42f8-8bb6-435d8695a05b', 6, 3000.00, 18000.00, NULL, '2025-07-25 08:39:38.139261+00'),
('54e31807-68ea-4cb6-8c17-fbe3d6f05446', '031ddd01-455e-4724-a314-221dca6d34e5', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-25 09:23:46.13163+00'),
('434feee4-23d1-40c0-8d2d-555093194357', 'c89d2204-fab7-455f-9722-ee13a821003a', '39ee6f9b-349d-4d3d-832a-112c5b38c5bc', 1, 2500.00, 2500.00, NULL, '2025-07-26 09:07:35.971667+00'),
('02848dc4-2bce-475b-abaf-ec64a690ca8c', 'c89d2204-fab7-455f-9722-ee13a821003a', '3789f932-02b1-4352-8f88-21ad68aee79c', 1, 2000.00, 2000.00, NULL, '2025-07-26 09:07:35.971667+00'),
('17535795-f98d-44b0-bf8a-19f463b361b7', 'c89d2204-fab7-455f-9722-ee13a821003a', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 2, 3000.00, 6000.00, NULL, '2025-07-26 09:07:35.971667+00'),
('ab52b204-9333-43bb-a0de-44b831086f21', 'e1365a83-e0a4-489f-9f81-204815799520', '39ee6f9b-349d-4d3d-832a-112c5b38c5bc', 2, 2500.00, 5000.00, NULL, '2025-07-26 23:01:09.548866+00'),
('22608c0f-2d2c-464a-9185-f69f5bd5aab3', 'e1365a83-e0a4-489f-9f81-204815799520', '475a787b-7261-48fd-8b3b-a2ef177cd8b2', 2, 2500.00, 5000.00, NULL, '2025-07-26 23:01:09.548866+00'),
('ea51ed1a-5106-4ec1-b059-ae53f8b9135b', 'e37ea606-bd3a-45b9-98fa-24f1ba31eb7a', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 2, 3000.00, 6000.00, NULL, '2025-07-26 23:01:23.776132+00'),
('d438280d-87d5-4fc9-b51e-45918bed3960', 'e37ea606-bd3a-45b9-98fa-24f1ba31eb7a', '39ee6f9b-349d-4d3d-832a-112c5b38c5bc', 2, 2500.00, 5000.00, NULL, '2025-07-26 23:01:23.776132+00'),
('50ec9ed2-77e7-4d01-ac53-6b25bb68f5af', '1cd31584-c61e-469c-859f-2a958785857b', '63570009-827c-4231-9851-197c81ed3fe7', 3, 2000.00, 6000.00, NULL, '2025-07-26 23:08:57.642444+00'),
('04500bbb-1bb8-44c7-a53f-88b75eab048b', '1cd31584-c61e-469c-859f-2a958785857b', '5bce0e15-6a97-4f2d-ac9a-710cf8fe879f', 1, 3000.00, 3000.00, NULL, '2025-07-26 23:08:57.642444+00'),
('0f0f1aa3-063d-4432-814a-6726a0641004', '1cd31584-c61e-469c-859f-2a958785857b', 'b8182df6-e271-4dfe-8726-52bbb30ccaf0', 1, 3000.00, 3000.00, NULL, '2025-07-26 23:08:57.642444+00'),
('6bb5ec86-2a94-466b-b751-319f33df4b65', '1cd31584-c61e-469c-859f-2a958785857b', 'b10dd860-5cba-4ff3-b97b-debdc1b8d3a8', 1, 3000.00, 3000.00, NULL, '2025-07-26 23:08:57.642444+00'),
('fec93ab4-6e4c-4685-b45c-b36748373055', '8e2a3160-451e-4817-b33b-5934231d938e', '39ee6f9b-349d-4d3d-832a-112c5b38c5bc', 1, 2500.00, 2500.00, NULL, '2025-07-26 23:11:25.330941+00'),
('76f497c7-b625-46fb-95a0-3dacac9d130a', '8e2a3160-451e-4817-b33b-5934231d938e', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 1, 3000.00, 3000.00, NULL, '2025-07-26 23:11:25.330941+00'),
('9edf4de3-52be-4bd1-9e49-a98e465ffb73', '8e2a3160-451e-4817-b33b-5934231d938e', '3789f932-02b1-4352-8f88-21ad68aee79c', 2, 2000.00, 4000.00, NULL, '2025-07-26 23:11:25.330941+00'),
('9b14b193-43f9-4b13-97a3-58b3526feafc', '69960f13-c48f-4cf4-b4f9-a78d7aa009d6', '39ee6f9b-349d-4d3d-832a-112c5b38c5bc', 2, 2500.00, 5000.00, NULL, '2025-07-26 23:11:41.307592+00'),
('25d3d555-0f48-4710-bab5-f75b192af805', '69960f13-c48f-4cf4-b4f9-a78d7aa009d6', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 2, 3000.00, 6000.00, NULL, '2025-07-26 23:11:41.307592+00'),
('e64efbde-a852-4a75-9283-87cbea525ce6', 'df06e002-a928-40d1-b537-ad401401d6d4', '39ee6f9b-349d-4d3d-832a-112c5b38c5bc', 1, 2500.00, 2500.00, NULL, '2025-07-26 23:11:53.079755+00'),
('ca8d50cd-5285-4a59-9c04-d4a3e18e8a50', 'df06e002-a928-40d1-b537-ad401401d6d4', '3789f932-02b1-4352-8f88-21ad68aee79c', 1, 2000.00, 2000.00, NULL, '2025-07-26 23:11:53.079755+00'),
('5e305dce-76ee-4183-9c85-b7263698bea0', 'df06e002-a928-40d1-b537-ad401401d6d4', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-26 23:11:53.079755+00'),
('795721ec-d9df-4f47-94b7-28f262f54d8f', '58d6c9c0-e9f8-4955-83e4-f62a82be7caa', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 2, 3000.00, 6000.00, NULL, '2025-07-28 03:30:23.903166+00'),
('6d2a2e19-9b09-42fb-8192-127d46e3d926', '58d6c9c0-e9f8-4955-83e4-f62a82be7caa', '5dbe4704-dd4f-42f8-8bb6-435d8695a05b', 2, 3000.00, 6000.00, NULL, '2025-07-28 03:30:23.903166+00'),
('06335b5f-a98d-4918-af19-e3e27d8174d3', '58d6c9c0-e9f8-4955-83e4-f62a82be7caa', '475a787b-7261-48fd-8b3b-a2ef177cd8b2', 2, 2500.00, 5000.00, NULL, '2025-07-28 03:30:23.903166+00'),
('da5dd5a1-196e-4171-8ba1-94eb42659028', 'ffcdfc1f-2dc1-4b14-8b0e-1fc534e8ca2c', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-28 03:36:28.571207+00'),
('78e8abc1-8c73-4eb8-8591-1790df5c25b5', 'ffcdfc1f-2dc1-4b14-8b0e-1fc534e8ca2c', '3789f932-02b1-4352-8f88-21ad68aee79c', 4, 2000.00, 8000.00, NULL, '2025-07-28 03:36:28.571207+00'),
('a1a4e58f-0bed-40c8-bb2c-d6600f64da63', 'ef8c6e81-3f5b-4604-ad33-e36c52a4b3fe', '3789f932-02b1-4352-8f88-21ad68aee79c', 3, 2000.00, 6000.00, NULL, '2025-07-28 03:53:12.978821+00'),
('8aab11fc-c734-4555-b397-37846422626c', '7064ee0e-0445-4f6b-a155-838bcfa1966e', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-28 03:53:25.612768+00'),
('1bff0996-7036-4139-b73c-129bee63f540', '8aaadd3e-e78b-44a9-b4fc-e1d79efc7664', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-28 03:53:36.644859+00'),
('a397984b-cce5-4c21-822e-a54ee4e7f45d', 'ab0c7099-6fd0-41a3-82a1-7fc267129292', 'ed5e90f8-ddf1-44b7-bdeb-73c4bab33adf', 3, 2500.00, 7500.00, NULL, '2025-07-28 04:06:46.520348+00'),
('d321ce5b-3092-4998-b793-b16bb5379192', '1cbd3c79-40c8-4773-9290-c5ec560b676d', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 3, 3000.00, 9000.00, NULL, '2025-07-28 04:07:01.130879+00'),
('264f27b8-fcc8-4763-bed4-58e1f461f411', '0dcb4ca4-9337-4f8a-9dfc-cca45f093b5e', 'ed5e90f8-ddf1-44b7-bdeb-73c4bab33adf', 3, 2500.00, 7500.00, NULL, '2025-07-28 04:11:33.219847+00'),
('d6770fee-d745-4e6f-a00a-edc5b655f6a3', '193da423-1dae-49f8-9e87-411bdfc457d4', '5dbe4704-dd4f-42f8-8bb6-435d8695a05b', 3, 3000.00, 9000.00, NULL, '2025-07-28 06:16:07.926657+00'),
('1b33eea9-3141-4a67-af58-2e6ada579cc4', '2b5932cf-7838-4f2b-8f20-918c371971c4', '3789f932-02b1-4352-8f88-21ad68aee79c', 3, 2000.00, 6000.00, NULL, '2025-07-28 06:19:44.198369+00'),
('6c080de1-ab48-41e3-9797-6d49f3cc8984', '1a9a7ace-8673-45cb-ad36-b445d694cf87', '3789f932-02b1-4352-8f88-21ad68aee79c', 3, 2000.00, 6000.00, NULL, '2025-07-28 06:20:05.169903+00'),
('dc43080f-304f-4952-9107-daa3b50b6196', '6b4e6299-99d3-49f3-a358-82f8a842357a', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 3, 3000.00, 9000.00, NULL, '2025-07-28 07:00:31.038154+00'),
('2e7db2ff-6a46-43cb-a9dc-ce38b96e500f', '8ca7f440-9ac0-403b-b66a-b97144864ccb', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 2, 3000.00, 6000.00, NULL, '2025-07-28 07:00:43.229002+00'),
('f9e4f19e-8822-4209-aef2-d55f4b193809', '8ca7f440-9ac0-403b-b66a-b97144864ccb', '39ee6f9b-349d-4d3d-832a-112c5b38c5bc', 2, 2500.00, 5000.00, NULL, '2025-07-28 07:00:43.229002+00'),
('6defbdc2-4c4c-4988-be38-0cc84caf937b', '3b642ebb-d10f-4abf-bf11-0abaca8bef12', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 4, 3000.00, 12000.00, NULL, '2025-07-28 07:15:16.998612+00'),
('21f5390a-76e4-461f-9bcc-bd8bf14baae3', '718719e9-8efd-4062-ace1-1e309f5820a0', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 3, 3000.00, 9000.00, NULL, '2025-07-28 10:54:46.881211+00'),
('face1bfd-f584-4ec3-86f9-cb2b933a3f36', 'c8a79c1d-1bd6-413e-90ee-2373a410d020', '39ee6f9b-349d-4d3d-832a-112c5b38c5bc', 3, 2500.00, 7500.00, NULL, '2025-07-28 11:07:01.235601+00'),
('83791912-25d9-4d5d-af9f-22526abc8ad2', '9a474b21-db47-46dd-a0ac-80475d141c42', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 3, 3000.00, 9000.00, NULL, '2025-07-28 11:47:39.318861+00'),
('266dccf6-1de3-4f78-b9a4-d0762724032a', 'fb86ac39-3312-498d-b715-12438a7da35f', '5242b2cb-bd08-481c-ae70-0236fda16dd0', 1, 3000.00, 3000.00, NULL, '2025-08-09 06:25:25.705612+00');

-- =====================================================
-- 7. RLS 정책 설정
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 메뉴를 볼 수 있도록 허용
CREATE POLICY "Anyone can view menus" ON public.menus FOR SELECT USING (true);

-- 모든 사용자가 주문을 생성할 수 있도록 허용
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Anyone can update orders" ON public.orders FOR UPDATE USING (true);

-- 주문 항목 정책
CREATE POLICY "Anyone can view order items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- 사용자 정책
CREATE POLICY "Anyone can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Anyone can create users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update users" ON public.users FOR UPDATE USING (true);

-- =====================================================
-- 완료!
-- =====================================================
SELECT '데이터베이스 복원 완료!' as status;

