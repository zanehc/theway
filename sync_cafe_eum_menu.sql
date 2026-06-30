-- Sync menus with the photographed Cafe Ieum menu board.
-- Keeps existing order history intact by updating rows by name and disabling
-- unavailable menu-board mismatches instead of deleting rows.

UPDATE menus SET
  name = '아이스 카라멜라떼',
  description = '카라멜 시럽이 들어간 달콤한 라떼',
  price = 3000,
  category = 'ice coffee',
  is_available = true,
  image_url = '/menu-images/generated/iced-caramel-macchiato.jpg'
WHERE name = '아이스 카라멜 마끼아또';

UPDATE menus SET
  name = '따뜻한 카라멜라떼',
  description = '카라멜 시럽이 들어간 달콤한 라떼',
  price = 3000,
  category = 'hot coffee',
  is_available = true,
  image_url = '/menu-images/generated/hot-caramel-macchiato.jpg'
WHERE name = '따뜻한 카라멜 마끼아또';

UPDATE menus SET
  name = '따뜻한 초코라떼',
  description = '따뜻한 초코라떼',
  price = 3000,
  category = 'hot coffee',
  is_available = true,
  image_url = '/menu-images/generated/hot-chocolate.jpg'
WHERE name = '핫초코';

UPDATE menus SET description = '아이스티에 에스프레소 샷을 더한 메뉴', price = 2500, category = 'ice coffee', is_available = true
WHERE name = '아샷추';

UPDATE menus SET description = '신선한 레몬의 상쾌한 맛', price = 2500, category = 'tea', is_available = true
WHERE name = '레몬차';

UPDATE menus SET description = '상큼하고 달콤한 유자차', price = 2500, category = 'tea', is_available = true
WHERE name = '유자차';

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '아이스 돌체라떼', '연유의 달콤함이 더해진 라떼', 3000, 'ice coffee', true, '/menu-images/generated/iced-cafe-latte.jpg'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '아이스 돌체라떼');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '따뜻한 돌체라떼', '연유의 달콤함이 더해진 라떼', 3000, 'hot coffee', true, '/menu-images/generated/hot-cafe-latte.jpg'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '따뜻한 돌체라떼');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '애플주스', '사과 주스', 2000, 'beverage', true, '/menu-images/generated/apple-juice.png'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '애플주스');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '뽀로로 주스', '어린이 음료', 1000, 'beverage', true, '/menu-images/generated/pororo-juice.png'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '뽀로로 주스');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '모구모구', '과즙 젤리 음료', 1000, 'beverage', true, '/menu-images/generated/mogu-mogu.png'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '모구모구');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '뽀로로 워터젤리', '어린이 워터젤리', 1000, 'beverage', true, '/menu-images/generated/pororo-water-jelly.png'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '뽀로로 워터젤리');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '카프리썬', '과일 음료', 1000, 'beverage', true, '/menu-images/generated/capri-sun.png'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '카프리썬');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '분다버그 자몽', '자몽맛 분다버그 탄산음료', 3000, 'beverage', true, '/menu-images/generated/bundaberg-grapefruit.png'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '분다버그 자몽');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '아이스티', '시원한 복숭아 아이스티', 2000, 'beverage', true, '/menu-images/generated/espresso-iced-tea.jpg'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '아이스티');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '자몽차', '따뜻한 자몽차', 2500, 'tea', true, '/menu-images/generated/hot-grapefruit-tea.png'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '자몽차');

INSERT INTO menus (name, description, price, category, is_available, image_url)
SELECT '생강차', '따뜻한 생강차', 2500, 'tea', true, '/menu-images/generated/hot-ginger-tea.png'
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE name = '생강차');

UPDATE menus SET image_url = '/menu-images/generated/apple-juice.png'
WHERE name = '애플주스';

UPDATE menus SET image_url = '/menu-images/generated/hot-grapefruit-tea.png'
WHERE name = '자몽차';

UPDATE menus SET image_url = '/menu-images/generated/hot-lemon-tea-v2.png'
WHERE name = '레몬차';

UPDATE menus SET image_url = '/menu-images/generated/hot-yuzu-tea-v2.png'
WHERE name = '유자차';

UPDATE menus SET image_url = '/menu-images/generated/hot-ginger-tea.png'
WHERE name = '생강차';

UPDATE menus SET image_url = '/menu-images/generated/teabag-tea.png'
WHERE name IN ('티백차', '티백 차');

UPDATE menus SET image_url = '/menu-images/generated/pororo-juice.png'
WHERE name = '뽀로로 주스';

UPDATE menus SET image_url = '/menu-images/generated/pororo-water-jelly.png'
WHERE name = '뽀로로 워터젤리';

UPDATE menus SET image_url = '/menu-images/generated/mogu-mogu.png'
WHERE name = '모구모구';

UPDATE menus SET image_url = '/menu-images/generated/capri-sun.png'
WHERE name = '카프리썬';

UPDATE menus SET image_url = '/menu-images/generated/bundaberg-grapefruit.png'
WHERE name = '분다버그 자몽';

UPDATE menus SET is_available = false
WHERE name IN ('아이스 카푸치노', '따뜻한 카푸치노');
