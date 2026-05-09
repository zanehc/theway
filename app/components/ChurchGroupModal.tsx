import { useState } from 'react';
import { supabase } from '~/lib/supabase';

interface ChurchGroupModalProps {
  userId: string;
  email?: string;
  initialName?: string;
  initialChurchGroup?: string;
  onSaved: (profile: { name: string; church_group: string }) => void;
}

export default function ChurchGroupModal({
  userId,
  email = '',
  initialName = '',
  initialChurchGroup = '',
  onSaved
}: ChurchGroupModalProps) {
  const [name, setName] = useState(initialName);
  const [churchGroup, setChurchGroup] = useState(initialChurchGroup);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const { data: updatedProfile, error: updateError } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          church_group: churchGroup.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select('id')
        .maybeSingle();

      if (updateError || !updatedProfile) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            email,
            name: name.trim(),
            church_group: churchGroup.trim(),
            role: 'customer'
          });

        if (insertError) {
          setError('저장에 실패했습니다. 다시 시도해주세요.');
          return;
        }
      }

      onSaved({
        name: name.trim(),
        church_group: churchGroup.trim()
      });
    } catch {
      setError('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-3 text-4xl">⛪</div>
          <h2 className="text-xl font-black text-ink">프로필 입력</h2>
          <p className="mt-2 text-sm text-mute">
            주문 시 자동 입력을 위해<br />이름과 소속 목장을 알려주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-bold text-body">
              이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-2xl border border-hairline bg-white px-4 text-base font-medium text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
              placeholder="예: 홍길동"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-body">
              소속 목장 *
            </label>
            <input
              type="text"
              value={churchGroup}
              onChange={(e) => setChurchGroup(e.target.value)}
              className="h-12 w-full rounded-2xl border border-hairline bg-white px-4 text-base font-medium text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
              placeholder="예: 1목장, 청년부 등"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim() || !churchGroup.trim()}
            className="h-12 w-full rounded-2xl bg-primary font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
