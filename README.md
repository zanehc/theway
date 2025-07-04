# 교회 카페 주문 시스템

교회 카페를 위한 효율적인 웹 기반 주문 및 관리 시스템입니다. Supabase를 백엔드로, Remix를 프론트엔드 프레임워크로 활용하여 구축되었습니다.

## 🎯 주요 기능

### 주문 및 음료 제조 관리
- **음료 주문 접수**: 직관적인 인터페이스로 빠르고 정확한 주문 접수
- **주문 현황판**: 실시간 주문 상태 확인 (대기 중, 제조 중, 완료)
- **주문 알림**: 음료 제조 완료 시 자동 알림 기능
- **메뉴 관리**: 카테고리별 메뉴 추가, 수정, 삭제

### 결제 확인 및 거래 기록
- **결제 방식**: 현금 및 계좌 이체 지원
- **결제 확인**: 수동 결제 확인 및 상태 관리
- **거래 기록**: 날짜별, 고객별, 목장별 주문 내역 조회

### 데이터 관리 및 통계
- **자동 계산**: 주문 시 총 금액 자동 계산
- **매출 데이터**: 일별, 주별, 월별 매출 현황
- **인기 메뉴 분석**: 메뉴별 판매 데이터 분석
- **고객 데이터**: 고객별 주문 내역 및 선호도 관리

### 사용자 기능
- **회원 가입 및 로그인**: 고객과 직원별 권한 관리
- **마이페이지**: 개인 주문 내역 조회
- **목장별 주문**: 교회 목장 단위 주문 관리
- **고객별 주문**: 개별 고객 주문 내역 관리

## 🎨 디자인 가이드라인

- **메인 컬러**: 레드 와인 (Red Wine) - 따뜻하고 고급스러운 느낌
- **보조 컬러**: 상아색 (Ivory) - 깔끔하고 부드러운 느낌
- **UI/UX**: 직관적이고 사용자 친화적인 인터페이스

## 🛠 기술 스택

### 프론트엔드
- **Remix**: SSR 및 클라이언트 사이드 렌더링 최적화
- **TypeScript**: 타입 안정성과 유지보수성 향상
- **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크
- **Lucide React**: 아이콘 라이브러리

### 백엔드
- **Supabase**: 
  - PostgreSQL 데이터베이스
  - 실시간 인증 시스템
  - Row Level Security (RLS)
  - 파일 스토리지

## 🚀 시작하기

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/church-cafe-order.git
cd church-cafe-order
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
```bash
cp env.example .env
```

`.env` 파일을 편집하여 Supabase 설정을 추가하세요:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `database/schema.sql` 파일의 내용을 Supabase SQL 편집기에서 실행
3. 환경 변수에 프로젝트 URL과 API 키 설정

### 5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하세요.

## 📁 프로젝트 구조

```
church-cafe-order/
├── app/
│   ├── lib/
│   │   └── supabase.server.ts    # Supabase 서버 설정
│   │   ├── routes/
│   │   │   ├── _index.tsx            # 홈페이지
│   │   │   ├── order.tsx             # 주문 페이지
│   │   │   ├── admin.tsx             # 관리자 페이지
│   │   │   └── login.tsx             # 로그인 페이지
│   │   ├── root.tsx                  # 루트 레이아웃
│   │   └── tailwind.css              # Tailwind CSS 스타일
│   ├── database/
│   │   └── schema.sql                # 데이터베이스 스키마
│   ├── public/                       # 정적 파일
│   └── package.json
```

## 🗄 데이터베이스 스키마

### 주요 테이블
- **users**: 사용자 정보 (고객, 직원, 관리자)
- **menus**: 메뉴 정보 (음료 종류, 가격, 카테고리)
- **orders**: 주문 정보 (고객, 총 금액, 상태, 결제 방법)
- **order_items**: 주문 항목 (메뉴별 수량, 가격)

### 보안
- Row Level Security (RLS) 적용
- 사용자별 권한 관리
- 안전한 API 엔드포인트

## 🔐 인증 및 권한

### 사용자 역할
- **customer**: 일반 고객 (주문 조회, 주문 생성)
- **staff**: 카페 직원 (주문 관리, 상태 업데이트)
- **admin**: 관리자 (메뉴 관리, 사용자 관리, 통계 조회)

### 보안 기능
- Supabase Auth를 통한 안전한 인증
- JWT 토큰 기반 세션 관리
- 데이터베이스 레벨 권한 제어

## 📱 주요 페이지

### 홈페이지 (`/`)
- 시스템 소개 및 기능 안내
- 주문하기 및 관리자 페이지 링크

### 주문 페이지 (`/order`)
- 메뉴 선택 및 장바구니 기능
- 고객 정보 입력
- 결제 방법 선택

### 관리자 페이지 (`/admin`)
- 실시간 주문 현황판
- 주문 상태 관리
- 메뉴 관리 (추가, 수정, 삭제)
- 결제 확인

### 로그인 페이지 (`/login`)
- 사용자 인증
- 역할별 권한 관리

## 🚀 배포

### Vercel 배포 (권장)
```bash
npm run build
```

1. Vercel에 프로젝트 연결
2. 환경 변수 설정
3. 자동 배포 설정

### 기타 플랫폼
- Netlify
- Railway
- Heroku

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

프로젝트에 대한 질문이나 문제가 있으시면 이슈를 생성해주세요.

---

**교회 카페 주문 시스템** - 효율적인 카페 운영을 위한 스마트한 솔루션 