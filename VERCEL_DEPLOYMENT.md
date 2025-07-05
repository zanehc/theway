# Vercel 배포 가이드

## 🚀 Vercel 배포 단계별 가이드

### 1. Vercel 프로젝트 연결

1. [Vercel Dashboard](https://vercel.com/dashboard)에 접속
2. "New Project" 클릭
3. GitHub 레포지토리 `zanehc/theway` 선택
4. "Import" 클릭

### 2. 프로젝트 설정

**Framework Preset**: `Remix` (자동 감지됨)
**Root Directory**: `./` (기본값)
**Build Command**: `npm run build` (자동 설정됨)
**Output Directory**: `build` (자동 설정됨)
**Install Command**: `npm install` (자동 설정됨)

### 3. 환경 변수 설정 (중요!)

Vercel 프로젝트 설정에서 다음 환경 변수를 추가하세요:

#### Supabase 설정
```
SUPABASE_URL=https://xqyycmwhhmgkuygddfue.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeXljbXdoaG1na3V5Z2RkZnVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjgzOTcsImV4cCI6MjA2NjkwNDM5N30.D0naUog2uyukObXl4ZVR6OiFOoKImCsrhg8-z6QGqro
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeXljbXdoaG1na3V5Z2RkZnVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTMyODM5NywiZXhwIjoyMDY2OTA0Mzk3fQ.h7t9FXOE74hwd1RJhCkq6fHZYaRTzcwjGYZXcdTPgMw
```

#### 앱 설정
```
NODE_ENV=production
```

### 4. 환경 변수 설정 방법

1. Vercel 프로젝트 대시보드에서 "Settings" 탭 클릭
2. "Environment Variables" 섹션으로 이동
3. 각 환경 변수를 추가:
   - **Name**: `SUPABASE_URL`
   - **Value**: `https://xqyycmwhhmgkuygddfue.supabase.co`
   - **Environment**: `Production`, `Preview`, `Development` 모두 선택
4. 나머지 환경 변수들도 동일하게 추가

### 5. 배포 실행

1. "Deploy" 버튼 클릭
2. 빌드 과정 모니터링 (약 2-3분 소요)
3. 배포 완료 후 제공되는 URL로 접속

### 6. 커스텀 도메인 설정 (선택사항)

1. "Settings" → "Domains" 섹션
2. 원하는 도메인 추가
3. DNS 설정 안내에 따라 도메인 설정

## 🔧 배포 후 확인사항

### 1. 기능 테스트
- [ ] 대시보드 페이지 로드
- [ ] 메뉴 목록 표시
- [ ] 새 주문 입력 기능
- [ ] 주문 현황판 표시
- [ ] 매출 보고 페이지

### 2. 환경 변수 확인
- [ ] Supabase 연결 정상
- [ ] 데이터베이스 쿼리 작동
- [ ] 주문 생성/수정 기능

### 3. 성능 확인
- [ ] 페이지 로딩 속도
- [ ] 이미지 및 리소스 로드
- [ ] 반응형 디자인

## 🚨 문제 해결

### 빌드 오류
```bash
# 로컬에서 빌드 테스트
npm run build
```

### 환경 변수 오류
- Vercel 대시보드에서 환경 변수 재확인
- Supabase 프로젝트 설정 확인

### 데이터베이스 연결 오류
- Supabase RLS 정책 확인
- API 키 권한 확인

## 📊 배포 후 모니터링

### Vercel Analytics
- 페이지 뷰
- 성능 메트릭
- 오류 로그

### Supabase Dashboard
- 데이터베이스 사용량
- API 호출 통계
- 실시간 로그

## 🔄 자동 배포 설정

GitHub 레포지토리에 푸시하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "Update: 새로운 기능 추가"
git push origin master
```

## 📞 지원

배포 중 문제가 발생하면:
1. Vercel 로그 확인
2. Supabase 연결 상태 확인
3. 환경 변수 재설정

---

**성공적인 배포를 위한 체크리스트:**
- [ ] GitHub 레포지토리 연결
- [ ] 환경 변수 설정 완료
- [ ] Supabase 프로젝트 활성화
- [ ] 첫 배포 성공
- [ ] 기능 테스트 완료 