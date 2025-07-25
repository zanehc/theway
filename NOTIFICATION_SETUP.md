# 글로벌 알림 시스템 설정 가이드

이 프로젝트에 글로벌 토스트 알림 시스템이 구현되었습니다. 모든 탭에서 작동하며 수동 확인 버튼이 있는 알림을 제공합니다.

## 🎯 구현된 기능

✅ **글로벌 토스트 알림**: 모든 탭/페이지에서 작동하는 실시간 알림  
✅ **수동 확인 버튼**: 자동으로 사라지지 않고 확인 버튼을 눌러야 닫힘  
✅ **음성 알림**: TTS를 사용한 한국어 음성 알림  
✅ **알림 타입별 색상**: 성공(초록), 오류(빨강), 경고(노랑), 정보(파랑)  
✅ **애니메이션**: 우측에서 슬라이드 인 효과  
✅ **전체 닫기**: 여러 알림이 있을 때 모두 닫기 버튼  

## 🔧 데이터베이스 설정 필요

알림 시스템이 작동하려면 `notifications` 테이블을 생성해야 합니다.

### 1. Supabase 대시보드에서 SQL 실행

1. Supabase 대시보드 접속
2. SQL 편집기로 이동
3. 아래 SQL 코드를 복사하여 실행:

\`\`\`sql
-- Create notifications table with proper schema
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_order_id_idx ON public.notifications(order_id);
CREATE INDEX IF NOT EXISTS notifications_status_idx ON public.notifications(status);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow system to insert notifications (for server-side operations)
CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.notifications TO postgres, anon, authenticated;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated;
\`\`\`

## 🧪 테스트 방법

데이터베이스 설정 후 알림 시스템을 테스트해보세요:

### 1. 새 주문 생성
- 새 주문을 생성하면 관리자에게 실시간 알림이 갑니다
- 주문한 사용자에게도 주문 확인 알림이 갑니다

### 2. 주문 상태 변경
- 관리자가 주문 상태를 변경하면 해당 사용자에게 알림이 갑니다
- 상태별 메시지: 제조중, 제조완료, 픽업완료, 취소

### 3. 결제 확인
- 결제 상태를 확인으로 변경하면 사용자에게 알림이 갑니다

### 4. 다른 탭에서 테스트
- 여러 탭을 열고 한 탭에서 작업하면 다른 탭에서도 알림이 나타나는지 확인

## 📂 구현된 파일들

### 새로 생성된 파일:
- `app/contexts/NotificationContext.tsx` - 글로벌 알림 컨텍스트
- `app/components/GlobalToast.tsx` - 토스트 알림 컴포넌트  
- `app/components/Layout.tsx` - 공통 레이아웃 (선택적 사용)

### 수정된 파일:
- `app/root.tsx` - 알림 프로바이더 추가
- `app/components/Header.tsx` - 중복 알림 로직 제거
- `app/lib/database.ts` - 알림 생성 함수 이미 구현됨
- `tailwind.config.js` - slideInRight 애니메이션 추가

## 🔍 알림 타입

현재 구현된 알림 타입들:

- `new_order` - 새 주문 (관리자에게)
- `order_confirmation` - 주문 확인 (주문자에게)  
- `order_status` - 주문 상태 변경 (주문자에게)
- `payment_confirmed` - 결제 확인 (주문자에게)

## 🎨 커스터마이징

### 알림 스타일 변경
`app/components/GlobalToast.tsx`에서 색상과 스타일을 수정할 수 있습니다.

### 알림 지속 시간 변경
현재는 수동 확인 방식이지만, 자동 사라짐을 원한다면 `NotificationContext.tsx`에서 setTimeout을 추가할 수 있습니다.

### 새 알림 타입 추가
1. `app/types/index.ts`에서 알림 타입 정의
2. `app/lib/database.ts`에서 해당 상황에 알림 생성 코드 추가
3. `GlobalToast.tsx`에서 아이콘과 색상 정의

## 🚀 배포 시 주의사항

- 프로덕션에서도 Supabase 실시간 구독이 활성화되어 있는지 확인
- 웹소켓 연결이 정상적으로 작동하는지 확인
- 브라우저별 TTS 지원 여부 확인

## 🐛 문제 해결

### 알림이 안 온다면:
1. 브라우저 콘솔에서 Supabase 연결 오류 확인
2. 네트워크 탭에서 웹소켓 연결 상태 확인  
3. notifications 테이블이 올바르게 생성되었는지 확인

### 음성 알림이 안 된다면:
- 브라우저에서 음성 권한이 허용되어 있는지 확인
- HTTPS 환경에서 테스트 (일부 브라우저는 HTTP에서 TTS 제한)

---

**이제 모든 탭에서 실시간 알림을 받을 수 있습니다! 🎉**