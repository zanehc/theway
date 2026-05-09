# 주문내역 — 그리드 패널 UI 재설계 계획

## Context

현재 `/orders/history` 페이지의 주문 목록은 **모바일은 세로 카드 / 데스크탑은 테이블** 두 가지 레이아웃으로 분리돼 있다. 데스크탑 테이블은 한 행에 정보가 가로로 길게 늘어서 있어 한 눈에 주문 상태를 파악하기 어렵고, 처리 중인 주문과 이미 끝난 주문이 시각적으로 구분되지 않는다.

이번 작업은 두 레이아웃을 **반응형 그리드 패널 UI 한 종류로 통합**하고, 주문 단계에 따라 패널 배경색을 달리해 시인성을 높인다. 관리자가 한 눈에 "지금 처리해야 할 주문"과 "이미 끝난 주문"을 구분할 수 있게 하는 게 목표다.

대시보드 탭 추가 작업(`order_dashboard_plan.md`)과는 **독립적인 변경**이며, 두 작업은 순서 무관하게 적용 가능하다.

---

## 디자인 결정

### 1. 색상 매핑 (시인성 핵심)

| 그룹 | 포함 상태 | 패널 배경 | 테두리 | 텍스트 | 의도 |
|------|----------|----------|--------|--------|------|
| **주문중 (action 필요)** | `pending`, `preparing`, `ready` | `bg-red-50` | `border-2 border-primary/30` | 진한 색 | 시선이 먼저 가도록 |
| **완료** | `completed` + `payment_confirmed` | `bg-surface-card` | `border border-hairline` | `text-mute` | 처리 끝남, 시각적으로 후퇴 |
| **결제 미확인 완료** | `completed` + `payment != confirmed` | `bg-yellow-50` | `border border-yellow-300` | 진한 색 | 결제확인 필요 — 중간 강조 |
| **취소** | `cancelled` | `bg-secondary-bg` | `border border-hairline` | `text-ash` line-through | 무력화된 느낌 |

> 색 토큰 출처: `tailwind.config.ts`의 기존 의미 색상(primary, surface-card, hairline, mute, ash, secondary-bg). 신규 색 추가 없음.

### 2. 패널 레이아웃 (한 패널 안)

```
┌──────────────────────────────────────┐
│ #00123              2:30 PM          │  ← 헤더 (작은 글씨, 양쪽 정렬)
│ 윤형창 · 1목장                       │  ← 고객 정보 (강조)
│ ─────────────────────────────────── │
│ • 아메리카노 × 2                     │
│ • 카페라떼 × 1                       │  ← 메뉴 리스트 (개행)
│ ─────────────────────────────────── │
│ [상태 진행바]                  ₩9,500│  ← 상태 + 금액
│ ─────────────────────────────────── │
│ [제조시작] [결제확인] [취소]         │  ← 액션 (관리자만) / 또는 [빠른주문] (고객)
└──────────────────────────────────────┘
```

- 폭: 그리드 셀에 맞게 자동 신축
- 높이: 메뉴 항목 수에 따라 자연스럽게 가변
- 헤더는 `text-xs text-mute`, 고객명은 `text-base font-bold`, 메뉴는 `text-sm`, 액션 버튼은 `text-xs`

### 3. 반응형 그리드

| 브레이크포인트 | 컬럼 수 | Tailwind |
|--------------|--------|----------|
| 모바일 (`<640px`) | 1 | `grid-cols-1` |
| 태블릿 (`640px+`) | 2 | `sm:grid-cols-2` |
| 데스크탑 (`1024px+`) | 3 | `lg:grid-cols-3` |
| 와이드 (`1280px+`) | 4 | `xl:grid-cols-4` |

`gap-3 sm:gap-4`로 패널 간격 통일.

### 4. 상태 필터 칩 (헤더 아래)

기존 `statusButtons` (`전체` / `주문중` / `주문완료`)를 활용해 상단 필터 칩 추가.
- **관리자 기본값: `주문중`** — 처리할 주문이 가장 먼저 보이도록
- 일반 고객 기본값: `전체`
- 취소된 주문은 별도 토글 (체크박스 "취소 포함") 또는 "전체"에 포함

### 5. 페이지네이션 조정

`ORDERS_PER_PAGE`를 10 → **12**로 변경 (4×3 = 12, 3×4 = 12로 그리드 정렬이 깔끔).

---

## 컴포넌트 분리

### 신규 파일

#### `app/components/orders/OrderPanel.tsx` (신규)
재사용 가능한 단일 주문 패널 컴포넌트. 한 곳에서만 색·레이아웃 관리.

**Props**:
```ts
interface OrderPanelProps {
  order: any;           // 기존 orders.history의 order 구조 그대로
  isAdmin: boolean;
  onQuickOrder?: (order: any) => void;
  onStatusChange?: (order: any, newStatus: string) => void;
  onPaymentConfirm?: (order: any) => void;
  onCancel?: (order: any) => void;
}
```

**내부 로직**:
- 패널 상태 분류 함수 `classifyOrder(order)`:
  - `'in-progress'` | `'completed'` | `'payment-pending'` | `'cancelled'`
- 클래스 계산: `getPanelClass(category)` → 위 색상 매핑 테이블 참조
- 액션 버튼은 기존 `AdminActions` 로직 그대로 흡수 (별도 컴포넌트 없이 인라인)

### 수정 파일

#### `app/routes/orders.history.tsx`
- 인라인 정의된 `AdminActions` 제거 → `OrderPanel` 내부로 이동
- 두 개의 렌더 분기 (모바일 카드 / 데스크탑 테이블) 모두 제거
- 단일 그리드로 교체:
  ```tsx
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
    {filteredOrders.slice(...).map((order) => (
      <OrderPanel key={order.id} order={order} isAdmin={isAdmin} ... />
    ))}
  </div>
  ```
- 상태 필터 칩 추가 (`selectedStatus` state) + 필터링 로직
- 관리자 기본 필터를 `inprogress`로 설정 (admin인 경우만)
- `ORDERS_PER_PAGE = 12`로 조정

---

## 변경하는 파일

| 파일 | 변경 |
|------|------|
| `app/components/orders/OrderPanel.tsx` | **신규** |
| `app/routes/orders.history.tsx` | **수정** (그리드 교체 + 필터 추가 + AdminActions 인라인 제거) |

기존 `OrderStatusProgress`, `orderUtils.ts`, `OrderCancellationModal` 등은 **재사용**하며 변경 없음.

---

## 재사용 자산

| 자산 | 위치 | 용도 |
|------|------|------|
| 색 토큰 (primary, surface-card, hairline, mute, ash) | `tailwind.config.ts` | 패널 배경/테두리/텍스트 |
| `OrderStatusProgress` | `app/components/orders/OrderStatusProgress.tsx` | 패널 안 진행바 |
| `statusButtons` | `app/components/orders/orderUtils.ts` | 상태 필터 칩 |
| `OrderCancellationModal` | `app/components/OrderCancellationModal.tsx` | 취소 사유 입력 |

---

## 검증

1. **빌드/타입 체크**: `npm run typecheck`, `npm run build` 통과
2. **관리자 시나리오** (`admin@naver.com`):
   - `/orders/history` 진입 → **주문중** 필터 기본 선택, 빨간색 패널만 표시되는지
   - 패널 안 [제조시작] 클릭 → 패널 색이 즉시 빨간 그대로 유지(아직 in-progress)
   - 픽업완료 + 결제확인 후 → 회색 패널로 전환
   - 취소 → 회색 + 줄긋기 패널로 전환
3. **고객 시나리오** (`chkomi95@gmail.com`):
   - 본인 주문만 표시 + 빠른주문 버튼만 노출
4. **반응형**:
   - Chrome DevTools에서 모바일/태블릿/데스크탑/와이드 폭 변경하면 1→2→3→4 컬럼 전환
5. **데이터 부재**:
   - 주문 0건일 때 "주문 내역이 없습니다" 정상 표시
   - 필터로 인해 결과 없을 때 동일 메시지 + 필터 초기화 안내
6. **시인성 정량 확인**:
   - 빨간 패널과 회색 패널이 한 화면에 섞여 있을 때 빨간 패널이 즉시 눈에 들어오는지 (실제 화면 캡처)
   - 텍스트 대비 WCAG AA 만족 (mute on red-50, ash on secondary-bg 모두 통과해야 함)

---

## 비고

- 차트가 필요하면 별도 작업(`order_dashboard_plan.md`)에서 다룸. 이 계획에는 차트 없음.
- 추후 필요시 패널을 클릭하면 상세 모달이 뜨는 식으로 확장 가능 (현재 스코프 외).
- 만약 빨간 배경이 너무 강하다고 느껴지면 `bg-red-50` → `bg-orange-50`으로 톤 조정 가능. 현재는 brand primary와 동일 계열로 통일.
