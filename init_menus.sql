-- 기존 메뉴 데이터 삭제 (선택사항)
-- DELETE FROM menus;

-- 기본 메뉴 데이터 추가
INSERT INTO menus (name, description, price, category, is_available) VALUES
-- 커피 카테고리
('아이스 아메리카노', '깔끔한 에스프레소와 물의 조화', 2000, 'coffee', true),
('따뜻한 아메리카노', '깔끔한 에스프레소와 물의 조화', 2000, 'coffee', true),
('아이스 카페라떼', '부드러운 우유와 에스프레소', 2500, 'coffee', true),
('따뜻한 카페라떼', '부드러운 우유와 에스프레소', 2500, 'coffee', true),
('아이스 카푸치노', '에스프레소와 스팀밀크, 우유거품', 2500, 'coffee', true),
('따뜻한 카푸치노', '에스프레소와 스팀밀크, 우유거품', 2500, 'coffee', true),
('아이스 카라멜 마끼아또', '달콤한 카라멜과 에스프레소', 3000, 'coffee', true),
('따뜻한 카라멜 마끼아또', '달콤한 카라멜과 에스프레소', 3000, 'coffee', true),
('아이스 바닐라 라떼', '바닐라 시럽이 들어간 부드러운 라떼', 3000, 'coffee', true),
('따뜻한 바닐라 라떼', '바닐라 시럽이 들어간 부드러운 라떼', 3000, 'coffee', true),
('아이스 모카', '진한 초콜릿과 에스프레소', 3500, 'coffee', true),
('따뜻한 모카', '진한 초콜릿과 에스프레소', 3500, 'coffee', true),
('아이스 화이트 모카', '화이트 초콜릿과 에스프레소', 3500, 'coffee', true),
('따뜻한 화이트 모카', '화이트 초콜릿과 에스프레소', 3500, 'coffee', true),

-- 음료 카테고리
('레몬에이드', '상큼한 레몬과 탄산수', 3000, 'beverage', true),
('유자에이드', '상큼한 유자와 탄산수', 3000, 'beverage', true),
('오렌지에이드', '상큼한 오렌지와 탄산수', 3000, 'beverage', true),
('라임에이드', '상큼한 라임과 탄산수', 3000, 'beverage', true),
('자몽에이드', '새콤달콤한 자몽에이드', 3500, 'beverage', true),
('청포도에이드', '상큼한 청포도에이드', 3500, 'beverage', true),
('딸기에이드', '달콤한 딸기에이드', 3500, 'beverage', true),
('망고에이드', '달콤한 망고에이드', 3500, 'beverage', true),
('복숭아에이드', '달콤한 복숭아에이드', 3500, 'beverage', true),
('패션후르츠에이드', '특별한 패션후르츠에이드', 4000, 'beverage', true),

-- 주스 카테고리
('오렌지주스', '신선한 오렌지 주스', 3000, 'juice', true),
('사과주스', '신선한 사과 주스', 3000, 'juice', true),
('포도주스', '신선한 포도 주스', 3000, 'juice', true),
('토마토주스', '신선한 토마토 주스', 3000, 'juice', true),
('당근주스', '신선한 당근 주스', 3500, 'juice', true),
('셀러리주스', '신선한 셀러리 주스', 3500, 'juice', true),

-- 스무디 카테고리
('딸기스무디', '신선한 딸기와 우유', 4000, 'smoothie', true),
('바나나스무디', '달콤한 바나나와 우유', 4000, 'smoothie', true),
('망고스무디', '달콤한 망고와 우유', 4000, 'smoothie', true),
('블루베리스무디', '신선한 블루베리와 우유', 4500, 'smoothie', true),
('키위스무디', '상큼한 키위와 우유', 4500, 'smoothie', true),
('패션후르츠스무디', '특별한 패션후르츠와 우유', 4500, 'smoothie', true),
('요거트스무디', '신선한 요거트와 과일', 4500, 'smoothie', true);

-- 메뉴 데이터 확인
SELECT 
  category,
  COUNT(*) as menu_count,
  AVG(price) as avg_price
FROM menus 
WHERE is_available = true 
GROUP BY category 
ORDER BY category; 