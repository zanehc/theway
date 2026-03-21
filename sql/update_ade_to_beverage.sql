-- 에이드류 메뉴들의 카테고리를 'beverage'로 업데이트
UPDATE menus 
SET category = 'beverage' 
WHERE name IN ('레몬에이드', '유자에이드', '오렌지에이드') 
AND category = 'ade';

-- 업데이트 결과 확인
SELECT name, category, price 
FROM menus 
WHERE name IN ('레몬에이드', '유자에이드', '오렌지에이드', '라임에이드', '자몽에이드')
ORDER BY name;

-- 새로운 메뉴 추가
INSERT INTO menus (name, description, price, category, is_available) VALUES
('아샷추', '에스프레소와 달콤한 연유의 완벽한 조화', 2500, 'coffee', true),
('유자차', '상큼하고 달콤한 유자차, 비타민C가 풍부', 2000, 'tea', true),
('레몬차', '신선한 레몬과 꿀의 조화, 상쾌한 맛', 2000, 'tea', true);

-- 추가된 메뉴 확인
SELECT name, category, price, description 
FROM menus 
WHERE name IN ('아샷추', '유자차', '레몬차')
ORDER BY category, name; 