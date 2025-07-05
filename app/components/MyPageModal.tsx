import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';

interface User {
  id: string;
  email: string;
  name: string;
  church_group?: string;
  role: string;
}

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyPageModal({ isOpen, onClose }: MyPageModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUserData();
    }
  }, [isOpen]);

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setUser(userData);
          setName(userData.name || '');
          setChurchGroup(userData.church_group || '');
        }
      }
    } catch (err) {
      setError('사용자 정보를 불러오는데 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          church_group: churchGroup.trim() || null,
        })
        .eq('id', user?.id);

      if (updateError) {
        setError('정보 수정에 실패했습니다.');
        return;
      }

      setSuccess('정보가 성공적으로 수정되었습니다.');
      setUser(prev => prev ? { ...prev, name: name.trim(), church_group: churchGroup.trim() || undefined } : null);
      
      // 3초 후 성공 메시지 숨기기
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-large p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-wine-800">마이페이지</h2>
          <button
            onClick={onClose}
            className="text-wine-600 hover:text-wine-800 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {user && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-wine-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

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
                목장
              </label>
              <input
                type="text"
                value={churchGroup}
                onChange={(e) => setChurchGroup(e.target.value)}
                className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                placeholder="목장명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-wine-700 mb-2">
                권한
              </label>
              <input
                type="text"
                value={user.role === 'admin' ? '관리자' : '일반 사용자'}
                disabled
                className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-wine text-black py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '저장 중...' : '정보 수정'}
              </button>
              
              <button
                type="button"
                onClick={handleLogout}
                className="px-6 py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
} 