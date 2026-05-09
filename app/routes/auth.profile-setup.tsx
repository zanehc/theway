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
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user || null;
        if (user) {
          setUser(user);

          // 기존 프로필 확인
          const profileRes = session?.access_token
            ? await fetch(`/api/profile-load?email=${encodeURIComponent(user.email || '')}`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
                cache: 'no-store',
              })
            : null;
          const profileResult = profileRes ? await profileRes.json().catch(() => ({})) : {};
          const profile = profileRes?.ok ? profileResult.user : null;

          if (profile) {
            setExistingProfile(profile);
            setName(profile.name || '');
            setChurchGroup(profile.church_group || '');
            if (profile.name?.trim() && profile.church_group?.trim()) {
              navigate('/', { replace: true });
            }
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
    setSuccess('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setError('로그인 세션이 만료됐습니다. 다시 로그인해주세요.');
        return;
      }

      const res = await fetch('/api/profile-save', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          church_group: churchGroup.trim(),
          email: user.email || '',
        }),
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok || !result.success) {
        setError(result.error || '사용자 정보 저장에 실패했습니다.');
        return;
      }

      setSuccess('프로필이 저장되었습니다.');
      window.setTimeout(() => {
        navigate('/?success=' + encodeURIComponent('프로필이 저장되었습니다.'), { replace: true });
      }, 700);
    } catch (err) {
      console.error('프로필 저장 오류:', err);
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading || !user) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-large p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">☕</div>
          <h1 className="text-2xl sm:text-3xl font-black text-ink mb-2">
            {existingProfile ? '프로필 수정' : '환영합니다!'}
          </h1>
          <p className="text-mute text-sm sm:text-base">
            {existingProfile
              ? '정보를 수정해주세요'
              : '이음카페 이용을 위해 정보를 입력해주세요'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-2xl text-sm font-bold">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-body mb-2">
              이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-hairline rounded-2xl text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-focus-outer focus:border-transparent transition-all duration-300"
              placeholder="이름을 입력하세요"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-body mb-2">
              소속 목장 *
            </label>
            <input
              type="text"
              value={churchGroup}
              onChange={(e) => setChurchGroup(e.target.value)}
              className="w-full px-4 py-3 border border-hairline rounded-2xl text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-focus-outer focus:border-transparent transition-all duration-300"
              placeholder="예: 1목장, 청년부 등"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 px-4 rounded-2xl font-bold  transition-all duration-300  disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '프로필 저장'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-mute">
          <p>이메일: {user.email}</p>
        </div>
      </div>
    </div>
  );
} 
