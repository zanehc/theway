import { useState, useEffect } from 'react';
import { useNavigate } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);

          // 기존 프로필 확인
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profile) {
            setExistingProfile(profile);
            setName(profile.name || '');
            setChurchGroup(profile.church_group || '');
          } else {
            // 소셜 로그인에서 가져온 이름이 있으면 기본값으로 설정
            const defaultName = user.user_metadata?.full_name ||
                               user.user_metadata?.name ||
                               user.email?.split('@')[0] || '';
            setName(defaultName);
          }
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('프로필 로딩 오류:', err);
      } finally {
        setInitialLoading(false);
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

    if (!churchGroup.trim()) {
      setError('소속 목장을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (existingProfile) {
        // 기존 프로필 업데이트
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: name.trim(),
            church_group: churchGroup.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('프로필 업데이트 오류:', updateError);
          setError('프로필 업데이트에 실패했습니다.');
          return;
        }
      } else {
        // 새 프로필 생성
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: name.trim(),
            role: 'customer',
            church_group: churchGroup.trim() || null,
          });

        if (insertError) {
          console.error('프로필 생성 오류:', insertError);
          setError('사용자 정보 저장에 실패했습니다.');
          return;
        }
      }

      // 성공 시 홈으로 리다이렉트
      navigate('/');
    } catch (err) {
      console.error('프로필 저장 오류:', err);
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading || !user) {
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
          <div className="text-5xl mb-4">☕</div>
          <h1 className="text-2xl sm:text-3xl font-black text-wine-800 mb-2">
            {existingProfile ? '프로필 수정' : '환영합니다!'}
          </h1>
          <p className="text-wine-600 text-sm sm:text-base">
            {existingProfile
              ? '정보를 수정해주세요'
              : '이음카페 이용을 위해 정보를 입력해주세요'}
          </p>
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
              소속 목장 *
            </label>
            <input
              type="text"
              value={churchGroup}
              onChange={(e) => setChurchGroup(e.target.value)}
              className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
              placeholder="예: 1목장, 청년부 등"
              required
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