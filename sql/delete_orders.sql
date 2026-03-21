-- 주문 데이터 삭제 스크립트

-- 먼저 현재 주문 데이터 확인
SELECT id, customer_name, status, created_at FROM orders ORDER BY created_at DESC;

-- 주문 아이템 삭제 (외래키 제약조건 때문에 먼저 삭제)
DELETE FROM order_items;

-- 주문 데이터 삭제
DELETE FROM orders;

-- 삭제 후 확인
SELECT COUNT(*) as remaining_orders FROM orders;
SELECT COUNT(*) as remaining_order_items FROM order_items; 