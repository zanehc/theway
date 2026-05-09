# 주문내역 페이지 — 관리자 대시보드 탭 추가

## Context

현재 `/orders/history` 페이지는 모든 사용자가 접근하는 주문 목록 페이지로, 관리자에게는 액션 버튼(제조시작/완료/픽업완료/결제확인/취소)이 노출된다. 관리자 입장에서 매출 추세나 목장별·메뉴별 판매 현황을 확인하려면 별도의 `/reports` 페이지로 이동해야 하는데, 일상 운영 동선상 주문 처리와 통계 확인이 같은 화면에서 이루어지면 효율이 높다.

이 작업은 `/orders/history` 페이지에 **관리자 전용 "대시보드" 탭**을 추가하여, 한 화면 안에서 주문 목록과 집계 통계를 토글하며 볼 수 있게 만든다. 일반 고객에게는 탭이 보이지 않는다.

기간 필터: **오늘 / 이번주 / 이번달 / 전체**
집계 대상: **결제완료(`payment_status = 'confirmed'`) 주문만**
집계 차원: **요약 / 목장별 / 메뉴별 / 일자별**

---

## 디자인 결정

### 1. 단일 페이지 안에 탭 — 별도 라우트 분리 안 함
- 사유: 관리자가 액션 처리 후 통계 확인 → 다시 처리로 돌아오는 동선이 잦음. 라우트 이동은 상태(필터/페이지) 손실 발생.
- 비관리자에게는 탭 자체가 렌더되지 않으므로 UX 부작용 없음.

### 2. 집계는 **서버 사이드**에서 수행 (신규 API 엔드포인트)
- 현재 `/api/orders/history`는 admin 200건 제한 → 이번달 집계가 부정확할 수 있음.
- 신규 `/api/orders/dashboard`는 service role + 기간 필터로 안전하게 전체 결제완료 주문을 조회하고, API 서버 안에서 집계까지 완료.
- 클라이언트에는 이미 그룹핑된 결과만 내려줘서 페이로드를 작게 유지.

### 3. 차트 라이브러리 도입 안 함
- 기존 `admin.reports.tsx`가 Tailwind 카드/리스트만으로 구성되어 있어 일관성 유지.
- 막대형 표시는 `width: ${percent}%` div로 충분.

### 4. 탭 디자인은 `admin.reports.tsx`의 세그먼티드 버튼 패턴 재사용
- 기존 코드와 시각적 일관성 + 신규 컴포넌트 추가 불필요.

---

## 구현 항목

### 신규 파일

#### `app/routes/api.orders.dashboard.tsx` (신규)
관리자 권한 검증 후 결제완료 주문을 기간별로 조회하여 집계 결과 반환.

**요청**: `GET /api/orders/dashboard?period=today|week|month|all`
**Authorization**: `Bearer <token>`

**응답**:
```ts
{
  period: 'today' | 'week' | 'month' | 'all';
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  range: { start: string | null; end: string | null; label: string };
  generatedAt: string;
  byChurchGroup: Array<{ name: string; count: number; revenue: number }>;  // revenue 내림차순
  byMenu: Array<{ menuId: string; name: string; quantity: number; revenue: number }>; // revenue 내림차순
  byDate: Array<{ date: string; count: number; revenue: number }>;          // 오래된순
}
```

**구현 포인트**:
- `requireAdmin` 헬퍼 — `api.admin-orders.tsx:15`의 패턴 그대로 복사 (admin/staff 모두 허용).
- 기간 계산 헬퍼 — 한국시간(`Asia/Seoul`) 기준. `오늘`은 KST 00:00~24:00, `이번주`는 월요일 시작, `이번달`은 해당 월 1일 시작.
- 집계 SQL: `orders` + `order_items` + `menus` 조인. service role로 RLS 우회.
- 결제완료 필터: `.eq('payment_status', 'confirmed')`. 취소 주문은 자동 제외 (`status != 'cancelled'`도 추가).
- 서버에서 그룹핑 (Map) — 기존 `database.ts:404`의 `getSalesStatistics` 스타일을 API 내부에서 적용.
- 목장명이 비어 있으면 `미입력`으로 정규화.

#### `app/components/dashboard/OrderDashboard.tsx` (신규)
대시보드 탭 본문. 기간 필터 + 4개 섹션 렌더.

**Props**:
```ts
{
  initialPeriod?: 'today' | 'week' | 'month' | 'all';
  onPeriodChange?: (period: 'today' | 'week' | 'month' | 'all') => void;
}
```

**상태**:
- `period`: `'today' | 'week' | 'month' | 'all'` (기본 `today`)
- `data`: 위 API 응답 형태
- `loading`, `error`
- 토큰은 컴포넌트 내부에서 `supabase.auth.getSession()`으로 조회

**섹션 구조**:
1. **기간 필터** (세그먼티드 버튼 4개) — `admin.reports.tsx:115-139` 패턴 재사용
2. **요약 카드 3개** — 총 매출 / 총 주문 / 평균 주문액
3. **목장별 판매** — 막대 리스트 (목장명 + 주문수 + 매출, 매출 비율 막대)
4. **메뉴별 판매** — 리스트 (메뉴명 + 수량 + 매출)
5. **일자별 매출** — 리스트 (날짜 + 주문수 + 매출)

각 섹션은 `bg-canvas rounded-2xl border border-hairline p-4` 카드로 감싸서 스크롤 가능.

### 수정 파일

#### `app/routes/orders.history.tsx`
탭 상태 추가 + 관리자에게만 탭 노출.

- URL 파라미터 기반 탭 상태: `?tab=dashboard&period=today`
- 제목 아래에 탭 스위처 — `isAdmin`일 때만 렌더
- `tab === 'list'`: 기존 주문 목록 그대로
- `tab === 'dashboard'`: `<OrderDashboard />` 렌더
- 비관리자가 URL 파라미터로 강제 진입해도 `isAdmin === false`이면 list 탭으로 fallback
- 대시보드 탭이 열려 있을 때 주문 알림 이벤트가 들어오면 조용히 refetch

탭 스위처 위치: 현재 `<h1>{isAdmin ? '전체 주문 내역' : ...}</h1>` 바로 아래 (line 285 근처).

---

## 재사용 자산

| 자산 | 위치 | 용도 |
|------|------|------|
| `requireAdmin` 패턴 | `app/routes/api.admin-orders.tsx:15-58` | 신규 API의 권한 검증 |
| 기간 라벨/범위 헬퍼 | `app/routes/admin.reports.tsx:60-104` | period → ISO 날짜 변환 |
| 세그먼티드 버튼 스타일 | `app/routes/admin.reports.tsx:115-139` | 기간 필터 버튼 |
| 매출 카드 스타일 | `app/routes/admin.reports.tsx`의 통계 카드들 | 요약 카드 3개 |
| `getSalesStatistics` 그룹핑 패턴 | `app/lib/database.ts:404` | 메뉴별 집계 로직 참고 |

---

## 변경하는 파일

- `app/routes/api.orders.dashboard.tsx` — **신규**
- `app/components/dashboard/OrderDashboard.tsx` — **신규**
- `app/routes/orders.history.tsx` — **수정** (탭 스위처 + 조건부 렌더)

기존 `admin.reports.tsx`, `database.ts`는 **건드리지 않음**.

---

## 검증

1. **로컬에서 admin@naver.com 으로 로그인**
2. `/orders/history` 진입 → 제목 아래 [주문 내역] [대시보드] 탭 노출 확인
3. **대시보드 탭 클릭**:
   - 4개 기간 버튼 표시
   - "오늘" 기본 선택 → 오늘 결제완료 주문 합계 표시
   - "전체"로 변경 → 누적 매출 표시
4. **데이터 정합성 검증**:
   - DB 직접 쿼리로 같은 기간 결제완료 주문 합계와 일치하는지 확인
   - 예: `node -e "..."`로 service role + period 쿼리 직접 실행
5. **권한 검증**:
   - 일반 고객 계정 로그인 → 탭 자체가 보이지 않음
   - `curl -H "Authorization: Bearer <customer-token>" /api/orders/dashboard?period=today` → 403 응답
   - staff 계정도 대시보드 접근 가능 확인
6. **빈 데이터 처리**:
   - 결제완료 주문이 0건인 기간 선택 → "데이터 없음" 메시지가 정상 표시
7. **Vercel 배포 후 production URL에서도 동일 시나리오 검증**

---

## 비고

- 차트가 시각적으로 더 필요해지면 추후 `recharts` 도입 가능. 현재는 도입 안 함.
- 추후 PDF 내보내기/Excel 다운로드 요청이 오면 `/api/orders/dashboard.csv` 추가하는 방식으로 확장 가능.
