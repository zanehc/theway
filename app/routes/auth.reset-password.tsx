import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { useNavigate } from "@remix-run/react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // URL에서 액세스 토큰 확인 (해시와 쿼리 파라미터 모두 확인)
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    let accessToken = urlParams.get('access_token');
    let refreshToken = urlParams.get('refresh_token');
    let type = urlParams.get('type');
    
    // 해시에서도 토큰 확인
    if (!accessToken && hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
      type = hashParams.get('type');
    }
    
    // type이 recovery가 아닌 경우 처리
    if (type !== 'recovery') {
      setError('유효하지 않은 비밀번호 재설정 링크입니다.');
      return;
    }
    
    console.log('URL params:', window.location.search);
    console.log('URL hash:', hash);
    console.log('Access token:', accessToken);
    console.log('Refresh token:', refreshToken);
    console.log('Type:', type);
    
    if (!accessToken) {
      setError('유효하지 않은 비밀번호 재설정 링크입니다.');
      return;
    }

    // 세션 설정
    const setSession = async () => {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ''
      });
      
      if (error) {
        console.error('Session error:', error);
        setError('세션 설정 중 오류가 발생했습니다: ' + error.message);
      } else {
        console.log('Session set successfully');
      }
    };

    setSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // 3초 후 홈으로 이동
        setTimeout(() => {
          navigate("/");
        }, 3000);
      }
    } catch (err) {
      setError('비밀번호 재설정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="text-green-600 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-semibold">비밀번호가 성공적으로 변경되었습니다!</p>
            </div>
            <p className="text-gray-600 mb-4">
              새로운 비밀번호로 로그인할 수 있습니다.
              잠시 후 홈 페이지로 이동합니다.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-wine-800 mb-6 text-center">새 비밀번호 설정</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
              placeholder="새 비밀번호를 입력하세요 (최소 6자)"
            />
          </div>
          
          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
              새 비밀번호 확인
            </label>
            <input
              type="password"
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
              placeholder="새 비밀번호를 다시 입력하세요"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "비밀번호 변경 중..." : "비밀번호 변경"}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/other")}
            className="text-wine-600 hover:text-wine-700 text-sm font-medium"
          >
            로그인 페이지로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
} 