import { useState, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // 소셜 로그인에서 가져온 이름이 있으면 기본값으로 설정
        if (user.user_metadata?.name) {
          setName(user.user_metadata.name);
        }
      } else {
        navigate('/');
      }
    };

    getUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // users 테이블에 사용자 정보 저장
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: name.trim(),
          role: 'customer',
          church_group: churchGroup.trim() || null,
        });

      if (userError) {
        setError('사용자 정보 저장에 실패했습니다.');
        return;
      }

      // 성공 시 홈으로 리다이렉트
      navigate('/');
    } catch (err) {
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-large p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-wine-800 mb-2">프로필 설정</h1>
          <p className="text-wine-600">추가 정보를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-wine-700 mb-2">
              이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-wine-700 mb-2">
              목장 (선택사항)
            </label>
            <input
              type="text"
              value={churchGroup}
              onChange={(e) => setChurchGroup(e.target.value)}
              className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
              placeholder="목장명을 입력하세요"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-wine text-black py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '프로필 저장'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-wine-500">
          <p>이메일: {user.email}</p>
        </div>
      </div>
    </div>
  );
} 