import { useState } from "react";
import { supabase } from "~/lib/supabase";
import { useNavigate } from "@remix-run/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('이메일 주소를 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://theway2.vercel.app/auth/reset-password'
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError('비밀번호 재설정 이메일 전송 중 오류가 발생했습니다.');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-lg font-semibold">비밀번호 재설정 이메일이 전송되었습니다!</p>
            </div>
            <p className="text-gray-600 mb-4">
              입력하신 이메일 주소로 비밀번호 재설정 링크를 보냈습니다.
              이메일을 확인하여 비밀번호를 재설정해주세요.
            </p>
            <button
              onClick={() => navigate("/other")}
              className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors"
            >
              로그인 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-wine-800 mb-6 text-center">비밀번호 재설정</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        <p className="text-gray-600 mb-6 text-center">
          가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
        </p>
        
        <form onSubmit={handleSendResetEmail} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
              placeholder="이메일 주소를 입력하세요"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "이메일 전송 중..." : "비밀번호 재설정 이메일 보내기"}
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