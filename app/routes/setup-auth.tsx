import { useState } from 'react';

export default function SetupAuth() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const sqlCommands = {
    disableEmailConfirmation: `-- 1. 이메일 확인 비활성화 (Supabase Dashboard > Authentication > Settings에서 수동 설정)
-- "Enable email confirmations" 체크 해제

-- 2. RLS 정책 설정 (Supabase Dashboard > Database > Policies에서 실행)
-- users 테이블 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- 새로운 정책 생성
CREATE POLICY "Users can insert their own data" ON users
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own data" ON users
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
FOR UPDATE USING (auth.uid() = id);

-- 3. 기존 사용자 이메일 확인 상태 업데이트 (선택사항)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;`,

    createTestUser: `-- 4. 테스트 사용자 생성 (선택사항)
-- 이 SQL은 Supabase Dashboard > SQL Editor에서 실행하지 마세요.
-- 대신 디버그 페이지에서 "테스트 사용자 생성" 버튼을 사용하세요.`,

    checkUsers: `-- 5. 사용자 확인 쿼리
-- Auth Users 확인
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC;

-- Database Users 확인
SELECT 
  id,
  email,
  name,
  church_group,
  role,
  created_at
FROM users 
ORDER BY created_at DESC;`
  };

  return (
    <div className="min-h-screen bg-gradient-warm p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-wine-800 mb-8 text-center">Supabase 인증 설정</h1>
        
        <div className="bg-white rounded-2xl shadow-large p-8 mb-8">
          <h2 className="text-2xl font-black text-wine-800 mb-6">설정 순서</h2>
          <div className="space-y-6">
            <div className="bg-ivory-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-wine-800 mb-4">1. Supabase Dashboard 설정</h3>
              <ol className="list-decimal list-inside text-wine-700 space-y-2">
                <li>Supabase 프로젝트 대시보드 접속</li>
                <li><strong>Authentication &gt; Settings</strong>에서 <strong>"Enable email confirmations"</strong> 체크 해제</li>
                <li><strong>Database &gt; Policies</strong>에서 아래 SQL 실행</li>
              </ol>
            </div>

            <div className="bg-ivory-50 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-wine-800 mb-4">2. 테스트</h3>
              <ol className="list-decimal list-inside text-wine-700 space-y-2">
                <li><a href="/debug-login" className="text-wine-600 underline font-bold">디버그 페이지</a>에서 "테스트 사용자 생성" 클릭</li>
                <li>생성된 계정으로 로그인 시도</li>
                <li>회원가입 후 자동 로그인 확인</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SQL 명령어 */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-large p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-wine-800">RLS 정책 설정 SQL</h3>
                <button
                  onClick={() => copyToClipboard(sqlCommands.disableEmailConfirmation, 'rls')}
                  className="px-4 py-2 bg-wine-600 text-white rounded-lg font-bold hover:bg-wine-700 transition-colors text-sm"
                >
                  {copied === 'rls' ? '복사됨!' : '복사'}
                </button>
              </div>
              <pre className="text-sm text-wine-700 bg-ivory-50 p-4 rounded-lg overflow-x-auto max-h-96">
                {sqlCommands.disableEmailConfirmation}
              </pre>
            </div>

            <div className="bg-white rounded-2xl shadow-large p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-wine-800">사용자 확인 쿼리</h3>
                <button
                  onClick={() => copyToClipboard(sqlCommands.checkUsers, 'check')}
                  className="px-4 py-2 bg-wine-600 text-white rounded-lg font-bold hover:bg-wine-700 transition-colors text-sm"
                >
                  {copied === 'check' ? '복사됨!' : '복사'}
                </button>
              </div>
              <pre className="text-sm text-wine-700 bg-ivory-50 p-4 rounded-lg overflow-x-auto max-h-96">
                {sqlCommands.checkUsers}
              </pre>
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-large p-6">
              <h3 className="text-xl font-black text-wine-800 mb-4">빠른 액션</h3>
              <div className="space-y-4">
                <a
                  href="/debug-login"
                  className="block w-full p-4 bg-gradient-wine text-ivory-50 rounded-lg font-bold hover:shadow-wine transition-all duration-300 text-center"
                >
                  🔧 로그인 디버그 페이지
                </a>
                <a
                  href="/"
                  className="block w-full p-4 bg-ivory-200 text-wine-700 rounded-lg font-bold hover:bg-wine-100 transition-colors text-center"
                >
                  🏠 홈으로 돌아가기
                </a>
                <a
                  href="/supabase-config"
                  className="block w-full p-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors text-center"
                >
                  📋 상세 설정 가이드
                </a>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-large p-6">
              <h3 className="text-xl font-black text-wine-800 mb-4">문제 해결</h3>
              <div className="space-y-3 text-sm">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-red-800 font-bold">🚨 로그인 실패</p>
                  <p className="text-red-700">이메일 확인을 비활성화했는지 확인하세요.</p>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                  <p className="text-yellow-800 font-bold">⚠️ RLS 오류</p>
                  <p className="text-yellow-700">RLS 정책이 올바르게 설정되었는지 확인하세요.</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-blue-800 font-bold">💡 팁</p>
                  <p className="text-blue-700">브라우저 콘솔에서 에러 메시지를 확인하세요.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-large p-6">
              <h3 className="text-xl font-black text-wine-800 mb-4">환경변수 확인</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-ivory-50 rounded">
                  <span className="text-wine-700">SUPABASE_URL:</span>
                  <span className="text-wine-800 font-bold">
                    {typeof window !== 'undefined' ? (window.__ENV?.SUPABASE_URL ? '✅ 설정됨' : '❌ 설정되지 않음') : '서버사이드'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-ivory-50 rounded">
                  <span className="text-wine-700">SUPABASE_ANON_KEY:</span>
                  <span className="text-wine-800 font-bold">
                    {typeof window !== 'undefined' ? (window.__ENV?.SUPABASE_ANON_KEY ? '✅ 설정됨' : '❌ 설정되지 않음') : '서버사이드'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 