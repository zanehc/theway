# 교회 카페 주문 시스템

교회 카페를 위한 효율적인 웹 기반 주문 및 관리 시스템입니다. Supabase를 백엔드로, Remix를 프론트엔드 프레임워크로 활용하여 구축되었습니다.

## 🎯 주요 기능

### ✅ 완성된 기능

#### 주문 및 음료 제조 관리
- **음료 주문 접수**: 직관적인 인터페이스로 빠르고 정확한 주문 접수
- **주문 현황판**: 실시간 주문 상태 확인 (대기 중, 제조 중, 완료, 픽업완료, 취소)
- **주문 상태 관리**: 제조 시작, 제조 완료, 픽업 완료 등 상태 변경
- **메뉴 관리**: 카테고리별 메뉴 추가, 수정, 삭제, 판매 상태 관리

#### 결제 확인 및 거래 기록
- **결제 방식**: 현금 및 계좌 이체 지원
- **결제 확인**: 수동 결제 확인 및 상태 관리
- **거래 기록**: 날짜별, 고객별, 목장별 주문 내역 조회

#### 데이터 관리 및 통계
- **자동 계산**: 주문 시 총 금액 자동 계산
- **매출 데이터**: 일별, 주별, 월별 매출 현황
- **인기 메뉴 분석**: 메뉴별 판매 데이터 분석
- **목장별 통계**: 목장별 주문 현황 및 매출 분석
- **시간대별 분석**: 시간대별 주문 현황 차트

#### 사용자 기능
- **목장별 주문**: 교회 목장 단위 주문 관리
- **고객별 주문**: 개별 고객 주문 내역 관리
- **요청사항**: 주문별 특별 요청사항 입력

## 🎨 디자인 가이드라인

- **메인 컬러**: 레드 와인 (Red Wine) - 따뜻하고 고급스러운 느낌
- **보조 컬러**: 상아색 (Ivory) - 깔끔하고 부드러운 느낌
- **UI/UX**: 
  - 현대적인 그라데이션 디자인
  - 부드러운 애니메이션 효과
  - 반응형 레이아웃
  - 직관적이고 사용자 친화적인 인터페이스

## 🛠 기술 스택

### 프론트엔드
- **Remix**: SSR 및 클라이언트 사이드 렌더링 최적화
- **TypeScript**: 타입 안정성과 유지보수성 향상
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **Vite**: 빠른 개발 서버 및 빌드 도구

### 백엔드
- **Supabase**: 
  - PostgreSQL 데이터베이스
  - Row Level Security (RLS)
  - 실시간 데이터베이스 연결

## 🚀 시작하기

### 1. 저장소 클론
```bash
git clone https://github.com/zanehc/theway.git
cd theway
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env` 파일을 생성하고 Supabase 설정을 추가하세요:

```env
# Supabase 설정
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# 앱 설정
NODE_ENV=development
```

### 4. Supabase 프로젝트 설정

1. Supabase에서 새 프로젝트 생성
2. 다음 SQL 스키마를 Supabase SQL 편집기에서 실행:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
  church_group TEXT, -- 목장 정보
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menus table
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  church_group TEXT, -- 목장 정보
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'confirmed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample menu data
INSERT INTO menus (name, description, price, category, is_available) VALUES
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
('레몬에이드', '상큼한 레몬과 탄산수', 3000, 'beverage', true),
('오렌지에이드', '신선한 오렌지 주스', 3000, 'juice', true),
('유자에이드', '신선한 딸기와 우유', 3000, 'smoothie', true),
('초코라떼', '진한 초콜릿과 우유', 3000, 'coffee', true);
```

3. 환경 변수에 프로젝트 URL과 API 키 설정

### 5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하세요.

## 📁 프로젝트 구조

```
theway/
├── app/
│   ├── components/
│   │   └── Header.tsx              # 헤더 컴포넌트
│   │   └── Header.tsx              # 헤더 컴포넌트
│   ├── lib/
│   │   ├── supabase.ts             # Supabase 클라이언트
│   │   └── database.ts             # 데이터베이스 쿼리 함수
│   ├── routes/
│   │   ├── _index.tsx              # 대시보드 (홈페이지)
│   │   ├── orders._index.tsx       # 주문 현황판
│   │   ├── orders.new.tsx          # 새 주문 입력
│   │   ├── menus._index.tsx        # 메뉴 관리
│   │   └── reports._index.tsx      # 매출 보고
│   ├── types/
│   │   └── index.ts                # TypeScript 타입 정의
│   ├── root.tsx                    # 루트 레이아웃
│   └── tailwind.css                # Tailwind CSS 스타일
├── public/                         # 정적 파일
├── package.json
└── tailwind.config.ts              # Tailwind CSS 설정
```

## 🗄 데이터베이스 스키마

### 주요 테이블

- **users**: 사용자 정보 (고객, 직원, 관리자)
- **menus**: 메뉴 정보 (음료 종류, 가격, 카테고리)
- **orders**: 주문 정보 (고객, 총 금액, 상태, 결제 방법)
- **order_items**: 주문 항목 (메뉴별 수량, 가격)

### 데이터 타입

```typescript
// 사용자 역할
type UserRole = 'customer' | 'staff' | 'admin';

// 주문 상태
type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

// 결제 방법
type PaymentMethod = 'cash' | 'transfer';

// 결제 상태
type PaymentStatus = 'pending' | 'confirmed';
```

## 📱 주요 페이지

### 대시보드 (`/`)
- 시스템 통계 (총 메뉴, 총 주문, 대기 중, 완료)
- 빠른 액션 버튼 (새 주문, 주문 현황, 메뉴 관리)
- 최근 주문 목록

### 주문 현황판 (`/orders`)
- 실시간 주문 상태 확인
- 상태별 필터링
- 주문 상태 변경 (제조 시작, 완료, 픽업 완료)
- 결제 상태 확인

### 새 주문 입력 (`/orders/new`)
- 카테고리별 메뉴 선택
- 수량 조절 및 장바구니 기능
- 고객 정보 입력 (이름, 목장)
- 결제 방법 선택
- 요청사항 입력

### 메뉴 관리 (`/menus`)
- 메뉴 목록 조회
- 새 메뉴 추가
- 메뉴 수정/삭제
- 판매 상태 관리

### 매출 보고 (`/reports`)
- 기간별 매출 통계 (오늘/이번주/이번달)
- 인기 메뉴 분석
- 목장별 주문 현황
- 시간대별 주문 현황
- 최근 주문 목록

## 🚀 배포

### Vercel 배포 (권장)

1. Vercel에 프로젝트 연결
2. 환경 변수 설정
3. 자동 배포 설정

```bash
npm run build
```

### 기타 플랫폼

- Netlify
- Railway
- Heroku

## 🔧 개발

### 개발 서버 실행
```bash
npm run dev
```

### 빌드
```bash
npm run build
```

### 타입 체크
```bash
npm run typecheck
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 지원

프로젝트에 대한 질문이나 문제가 있으시면 이슈를 생성해주세요.

---

**교회 카페 주문 시스템** - 효율적인 카페 운영을 위한 스마트한 솔루션

## 최근 업데이트

### v1.0.0 (2025-01-04)
- ✅ 교회 카페 주문 시스템 완성
- ✅ 현대적인 UI/UX 디자인 적용
- ✅ Supabase 연동 완료
- ✅ 주문 관리, 메뉴 관리, 매출 보고 기능 구현
- ✅ 반응형 디자인 적용
- ✅ TypeScript 타입 안정성 확보
