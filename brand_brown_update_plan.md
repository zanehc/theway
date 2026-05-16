# 레드와인색 → 로고 브라운 변경 계획

## 기준 색상

- 로고 메인 브라운: `#9E5423` (`RGB(158, 84, 35)`)
- 로고 서브 브라운: `#BA7654` (`RGB(188, 118, 84)`)
- 권장 pressed/hover 브라운: `#7F3F18`
- 흰색 텍스트 대비: `#9E5423`은 5.61:1, `#7F3F18`은 8.00:1로 일반 버튼 텍스트에 사용 가능
- `#BA7654` 위 흰색 텍스트는 3.62:1이라 큰 장식/보조 요소에만 사용

## 1단계: 브랜드 토큰만 교체

대상: `tailwind.config.js`

- `primary: '#e60023'` → `primary: '#9E5423'`
- `primary-pressed: '#cc001f'` → `primary-pressed: '#7F3F18'`
- `wine.600` → `#9E5423`
- `wine.700` → `#7F3F18`
- `gradient-wine` → 브라운 계열로 변경
- `error`, `error-deep`은 오류/삭제/취소 의미색으로 남겨 브랜드 색과 분리

## 2단계: 와인 alias 정리

현재 `wine-*` 클래스는 실제 와인색이라기보다 브랜드 강조색 alias로 쓰이고 있습니다.

- 단기: `wine.600/700`만 브라운으로 매핑해 기존 화면을 안정적으로 전환
- 중기: `bg-wine-600`, `text-wine-600`, `border-wine-*`를 `primary` 또는 새 `brand-*` 이름으로 점진 교체
- 장기: Tailwind 색상 이름에서 `wine`을 제거하거나 하위 호환 alias로만 유지

## 3단계: 의미색 보호

다음은 브랜드 브라운으로 바꾸지 않습니다.

- 오류 메시지: `text-red-*`, `bg-red-*`, `border-red-*`
- 삭제/취소 버튼: `OrderCancellationModal`, 관리자 이미지 삭제 안내, 로그아웃/위험 액션
- 상태 표현: `cancelled`, 실패 토스트, 검증 오류

## 4단계: 화면별 검수

우선 확인 대상:

- 홈: `app/routes/_index.tsx`
- 공통 헤더: `app/components/Header.tsx`
- 주문 생성: `app/routes/orders.new.tsx`
- 주문 내역: `app/routes/orders.history.tsx`
- 관리자 주문/메뉴/공지: `app/routes/admin.*.tsx`
- 하단 내비게이션: `app/components/BottomNavigation.tsx`

검수 기준:

- 주요 CTA 버튼의 흰색 텍스트 대비 유지
- 작은 배지/칩에서 글자가 흐려지지 않는지 확인
- 오류/취소/삭제 색상이 브랜드 브라운과 섞이지 않는지 확인
- 모바일 헤더에서 새 로고와 우측 버튼이 겹치지 않는지 확인

## 5단계: 적용 순서

1. `tailwind.config.js` 토큰 교체
2. 홈/헤더/주요 CTA 시각 확인
3. `wine-*` 클래스 사용처를 브랜드 alias로 정리
4. 오류/취소 계열 `red-*`는 유지하면서 필요한 곳만 `error` 토큰으로 통일
5. `npm run typecheck`와 `npm run build` 실행
