import { useState } from 'react';

export default function SupabaseConfig() {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: "1. Supabase Dashboard 접속",
      content: (
        <div className="space-y-4">
          <p className="text-wine-700">Supabase 프로젝트 대시보드에 접속하세요.</p>
          <div className="bg-ivory-50 p-4 rounded-lg">
            <p className="font-bold text-wine-800 mb-2">확인할 항목:</p>
            <ul className="list-disc list-inside text-wine-700 space-y-1">
              <li>프로젝트 URL과 API 키가 올바른지 확인</li>
              <li>Authentication 설정 확인</li>
              <li>Database 테이블 구조 확인</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "2. Authentication 설정",
      content: (
        <div className="space-y-4">
          <p className="text-wine-700">Authentication &gt; Settings에서 다음 설정을 확인하세요:</p>
          <div className="bg-ivory-50 p-4 rounded-lg">
            <p className="font-bold text-wine-800 mb-2">필요한 설정:</p>
            <ul className="list-disc list-inside text-wine-700 space-y-1">
              <li><strong>Enable email confirmations:</strong> OFF (개발 중에는 비활성화)</li>
              <li><strong>Enable phone confirmations:</strong> OFF</li>
              <li><strong>Enable manual linking:</strong> ON</li>
              <li><strong>JWT expiry:</strong> 3600 (1시간)</li>
            </ul>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-yellow-800 font-bold">⚠️ 주의사항</p>
            <p className="text-yellow-700 text-sm">프로덕션 환경에서는 이메일 확인을 활성화하는 것이 좋습니다.</p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "3. Database RLS 정책 확인",
      content: (
        <div className="space-y-4">
          <p className="text-wine-700">Database &gt; Policies에서 users 테이블의 RLS 정책을 확인하세요:</p>
          <div className="bg-ivory-50 p-4 rounded-lg">
            <p className="font-bold text-wine-800 mb-2">필요한 정책:</p>
            <ul className="list-disc list-inside text-wine-700 space-y-1">
              <li><strong>Enable RLS:</strong> ON</li>
              <li><strong>Insert policy:</strong> 인증된 사용자가 자신의 정보를 삽입할 수 있음</li>
              <li><strong>Select policy:</strong> 인증된 사용자가 자신의 정보를 조회할 수 있음</li>
              <li><strong>Update policy:</strong> 인증된 사용자가 자신의 정보를 수정할 수 있음</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-blue-800 font-bold">💡 SQL 예시</p>
            <pre className="text-sm text-blue-700 bg-blue-100 p-2 rounded mt-2 overflow-x-auto">
{`-- users 테이블 RLS 정책 예시
CREATE POLICY "Users can insert their own data" ON users
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own data" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
FOR UPDATE USING (auth.uid() = id);`}
            </pre>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "4. 환경변수 확인",
      content: (
        <div className="space-y-4">
          <p className="text-wine-700">프로젝트 루트의 .env 파일을 확인하세요:</p>
          <div className="bg-ivory-50 p-4 rounded-lg">
            <p className="font-bold text-wine-800 mb-2">필요한 환경변수:</p>
            <pre className="text-sm text-wine-700 bg-white p-3 rounded border overflow-x-auto">
{`SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here`}
            </pre>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-green-800 font-bold">✅ 확인 방법</p>
            <p className="text-green-700 text-sm">브라우저 콘솔에서 <code>window.__ENV</code>를 입력하여 환경변수가 제대로 로드되었는지 확인하세요.</p>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "5. 테스트 및 디버깅",
      content: (
        <div className="space-y-4">
          <p className="text-wine-700">설정 완료 후 다음 단계로 테스트하세요:</p>
          <div className="bg-ivory-50 p-4 rounded-lg">
            <p className="font-bold text-wine-800 mb-2">테스트 순서:</p>
            <ol className="list-decimal list-inside text-wine-700 space-y-1">
              <li><a href="/debug-login" className="text-wine-600 underline">디버그 페이지</a>에서 "테스트 사용자 생성" 클릭</li>
              <li>생성된 계정으로 로그인 시도</li>
              <li>브라우저 콘솔에서 에러 메시지 확인</li>
              <li>Supabase Dashboard에서 Auth Users와 Database Users 확인</li>
            </ol>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <p className="text-red-800 font-bold">🚨 문제 해결</p>
            <ul className="list-disc list-inside text-red-700 space-y-1 text-sm">
              <li>이메일 확인이 활성화되어 있다면 비활성화하거나 확인 이메일을 클릭하세요</li>
              <li>RLS 정책이 너무 제한적이라면 임시로 비활성화해보세요</li>
              <li>환경변수가 올바르지 않다면 서버를 재시작하세요</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-warm p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-wine-800 mb-8 text-center">Supabase 설정 가이드</h1>
        
        <div className="bg-white rounded-2xl shadow-large p-8">
          {/* 단계 네비게이션 */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-2">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setCurrentStep(step.id)}
                  className={`px-4 py-2 rounded-lg font-bold transition-all duration-300 ${
                    currentStep === step.id
                      ? 'bg-gradient-wine text-ivory-50 shadow-wine'
                      : 'bg-ivory-200 text-wine-700 hover:bg-wine-100'
                  }`}
                >
                  {step.id}
                </button>
              ))}
            </div>
          </div>

          {/* 현재 단계 내용 */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-wine-800 mb-6">{steps[currentStep - 1].title}</h2>
            {steps[currentStep - 1].content}
          </div>

          {/* 네비게이션 버튼 */}
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-ivory-200 text-wine-700 rounded-lg font-bold hover:bg-wine-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <button
              onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
              disabled={currentStep === steps.length}
              className="px-6 py-3 bg-gradient-wine text-ivory-50 rounded-lg font-bold hover:shadow-wine transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>

        {/* 빠른 링크 */}
        <div className="mt-8 bg-white rounded-2xl shadow-large p-6">
          <h3 className="text-xl font-black text-wine-800 mb-4">빠른 링크</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/debug-login"
              className="p-4 bg-gradient-wine text-ivory-50 rounded-lg font-bold hover:shadow-wine transition-all duration-300 text-center"
            >
              로그인 디버그 페이지
            </a>
            <a
              href="/"
              className="p-4 bg-ivory-200 text-wine-700 rounded-lg font-bold hover:bg-wine-100 transition-colors text-center"
            >
              홈으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 