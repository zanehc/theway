import { useState } from 'react';
import { supabase } from '~/lib/supabase';

const TERMS_CONTENT = {
  service: `제1조(목적)\n이 약관은 길을여는교회 이음카페(이하 \"이음카페\")가 제공하는 온라인 주문 서비스(이하 \"서비스\")의 이용과 관련하여, 이음카페와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.\n\n제2조(정의)\n1. \"이용자\"란 이 약관에 따라 이음카페가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.\n2. \"회원\"이란 이음카페에 개인정보를 제공하여 회원등록을 한 자로서, 이음카페의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다.\n\n제3조(약관의 효력 및 변경)\n1. 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력을 발생합니다.\n2. 이음카페는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경된 약관은 공지 또는 통지함으로써 효력을 발생합니다.\n\n제4조(서비스의 제공 및 변경)\n1. 이음카페는 다음과 같은 서비스를 제공합니다.\n  1) 카페 메뉴 조회 및 주문\n  2) 주문 내역 확인\n  3) 기타 이음카페가 정하는 서비스\n2. 서비스의 내용은 운영상, 기술상 필요에 따라 변경될 수 있습니다.\n\n제5조(서비스의 중단)\n이음카페는 시스템 점검, 교체, 고장, 통신두절 등의 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.\n\n제6조(이용자의 의무)\n이용자는 관계 법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항, 이음카페가 통지하는 사항 등을 준수하여야 하며, 기타 이음카페의 업무에 방해되는 행위를 하여서는 안 됩니다.\n\n제7조(면책조항)\n이음카페는 천재지변, 불가항력적 사유, 이용자의 귀책사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.`,
  privacy: `제1조(수집하는 개인정보 항목)\n이음카페는 회원가입, 주문, 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.\n- 필수항목: 이름, 이메일, 비밀번호, 소속 목장\n- 선택항목: 프로모션 정보 수신 동의 여부\n\n제2조(개인정보의 수집 및 이용 목적)\n이음카페는 수집한 개인정보를 다음의 목적을 위해 활용합니다.\n- 회원 관리 및 본인 확인\n- 주문 및 결제 서비스 제공\n- 공지사항 전달 및 고객 문의 응대\n- 프로모션 및 이벤트 안내(동의한 경우)\n\n제3조(개인정보의 보유 및 이용기간)\n이용자의 개인정보는 회원 탈퇴 시까지 보관하며, 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 보존이 필요한 경우에는 해당 기간 동안 보관합니다.\n\n제4조(동의 거부권 및 불이익)\n이용자는 개인정보 수집 및 이용에 동의하지 않을 권리가 있습니다. 단, 필수항목 미동의 시 회원가입 및 서비스 이용이 제한될 수 있습니다.`,
  location: `제1조(위치정보의 수집 및 이용 목적)\n이음카페는 주문 서비스 제공 및 매장 위치 안내를 위해 이용자의 위치정보를 수집·이용할 수 있습니다.\n\n제2조(위치정보의 보유 및 이용기간)\n수집된 위치정보는 서비스 제공 목적 달성 후 즉시 파기합니다.\n\n제3조(동의 거부권 및 불이익)\n이용자는 위치정보 수집 및 이용에 동의하지 않을 권리가 있습니다. 단, 동의하지 않을 경우 일부 위치기반 서비스 이용이 제한될 수 있습니다.`,
  promo: `제1조(목적)\n이음카페는 신제품, 이벤트, 할인 등 각종 프로모션 정보를 이메일 등으로 안내할 수 있습니다.\n\n제2조(수신 동의 및 철회)\n이용자는 프로모션 정보 수신에 동의하지 않을 수 있으며, 동의 후에도 언제든지 수신 거부(마이페이지 등)를 할 수 있습니다.`
};

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [terms, setTerms] = useState({
    service: false,
    privacy: false,
    location: false,
    promo: false,
  });
  const [modal, setModal] = useState<{type: null | 'service' | 'privacy' | 'location' | 'promo'}>({type: null});

  const allRequiredAgreed = terms.service && terms.privacy && terms.location;
  const handleAllRequired = (checked: boolean) => {
    setTerms(t => ({
      ...t,
      service: checked,
      privacy: checked,
      location: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 필수 약관 체크
    if (!terms.service || !terms.privacy || !terms.location) {
      setError('필수 약관에 모두 동의해야 회원가입이 가능합니다.');
      return;
    }

    if (!email.trim() || !name.trim() || !password.trim() || !passwordConfirm.trim() || !churchGroup.trim()) {
      setError('모든 필수 정보를 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('이메일 형식으로 작성해 주세요.');
      return;
    }
    // 비밀번호 길이 검사
    if (password.length < 6) {
      setError('비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      console.log('회원가입 시작:', email.trim());
      
      // 1. Supabase Auth에 사용자 생성 (이메일 확인 비활성화)
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            church_group: churchGroup.trim(),
            terms_service: terms.service,
            terms_privacy: terms.privacy,
            terms_location: terms.location,
            terms_promo: terms.promo,
            role: 'customer',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      console.log('Auth signup 결과:', { data, error });

      if (error) {
        console.error('Auth signup 에러:', error);
        if (error.message.includes('User already registered') || error.message.includes('already registered')) {
          setError('아이디가 중복입니다.');
        } else {
          setError(`회원가입 실패: ${error.message}`);
        }
        return;
      }

      // 2. users 테이블에 사용자 정보 저장
      const userId = data.user?.id;
      if (userId) {
        console.log('users 테이블에 저장 시작:', userId);
        
        const { error: insertError } = await supabase.from('users').insert({
          id: userId,
          email: email.trim(),
          name: name.trim(),
          church_group: churchGroup.trim(),
          terms_service: terms.service,
          terms_privacy: terms.privacy,
          terms_location: terms.location,
          terms_promo: terms.promo,
          role: 'customer',
          created_at: new Date().toISOString(),
        });

        if (insertError) {
          console.error('users 테이블 저장 에러:', insertError);
          if (insertError.code === '23505' || (insertError.message && insertError.message.includes('duplicate key'))) {
            setError('이미 등록된 정보가 있습니다.');
          } else if (insertError.code === '23502' || (insertError.message && insertError.message.includes('null value'))) {
            setError('필수 정보를 모두 입력해 주세요.');
          } else if (insertError.code === '23503' || (insertError.message && insertError.message.includes('foreign key'))) {
            setError('시스템 오류가 발생했습니다. 관리자에게 문의해 주세요.');
          } else {
            setError('회원 정보 저장 중 오류가 발생했습니다: ' + (insertError.message || '알 수 없는 오류'));
          }
          return;
        }

        console.log('회원가입 완료:', { userId, email: email.trim() });
        
        // 3. 회원가입 완료 후 자동 로그인
        console.log('자동 로그인 시도:', email.trim());
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInError) {
          console.error('자동 로그인 에러:', signInError);
          setSuccess('회원가입이 완료되었습니다! 로그인 버튼을 클릭하여 로그인하세요.');
        } else {
          console.log('자동 로그인 성공:', signInData);
          setSuccess('회원가입이 완료되었습니다! 자동으로 로그인되었습니다.');
          
          // 성공 시 폼 초기화
          setEmail('');
          setName('');
          setPassword('');
          setPasswordConfirm('');
          setChurchGroup('');
          setTerms({
            service: false,
            privacy: false,
            location: false,
            promo: false,
          });

          // 2초 후 페이지 새로고침
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        setError('사용자 ID를 생성할 수 없습니다.');
      }
    } catch (err) {
      console.error('회원가입 예외:', err);
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}
      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">이메일</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300" placeholder="이메일을 입력하세요" required />
      </div>
      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">이름</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300" placeholder="이름을 입력하세요" required />
      </div>
      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">비밀번호</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300" placeholder="비밀번호를 입력하세요" required />
      </div>
      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">비밀번호 확인</label>
        <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300" placeholder="비밀번호를 다시 입력하세요" required />
      </div>
      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">소속 목장</label>
        <input type="text" value={churchGroup} onChange={e => setChurchGroup(e.target.value)} className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300" placeholder="소속 목장명을 입력하세요" required />
      </div>
      <div className="mb-6">
        <label className="block font-bold mb-2">약관 동의</label>
        <div className="space-y-2">
          <label className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={allRequiredAgreed}
              onChange={e => handleAllRequired(e.target.checked)}
            />
            <span className="ml-2 text-wine-800 font-bold text-base cursor-pointer">전체 동의 (필수)</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={terms.service} onChange={e => setTerms(t => ({...t, service: e.target.checked}))} required />
            <span className="ml-2 text-wine-700 font-medium text-base cursor-pointer underline" onClick={() => setModal({type: 'service'})}>[필수] 서비스 이용약관 동의</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={terms.privacy} onChange={e => setTerms(t => ({...t, privacy: e.target.checked}))} required />
            <span className="ml-2 text-wine-700 font-medium text-base cursor-pointer underline" onClick={() => setModal({type: 'privacy'})}>[필수] 개인정보 수집 및 이용 동의</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={terms.location} onChange={e => setTerms(t => ({...t, location: e.target.checked}))} required />
            <span className="ml-2 text-wine-700 font-medium text-base cursor-pointer underline" onClick={() => setModal({type: 'location'})}>[필수] 위치정보 이용약관 동의</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={terms.promo} onChange={e => setTerms(t => ({...t, promo: e.target.checked}))} />
            <span className="ml-2 text-wine-700 font-medium text-base cursor-pointer underline" onClick={() => setModal({type: 'promo'})}>[선택] 프로모션 정보 수신 동의</span>
          </label>
        </div>
      </div>
      {modal.type && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setModal({type: null})}>
          <div className="bg-white rounded-2xl p-8 shadow-large min-w-[350px] max-w-lg max-h-[80vh] overflow-y-auto animate-scale-in relative" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setModal({type: null})}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-wine-800 mb-4 text-center">{modal.type === 'service' ? '서비스 이용약관' : modal.type === 'privacy' ? '개인정보 수집 및 이용 동의' : modal.type === 'location' ? '위치정보 이용약관' : '프로모션 정보 수신 동의'}</h2>
            <pre className="whitespace-pre-wrap text-wine-700 text-base leading-relaxed">{TERMS_CONTENT[modal.type]}</pre>
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="flex-1 bg-gradient-wine text-black py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? '회원가입 중...' : '회원가입'}
        </button>
        <button type="button" onClick={onSwitchToLogin} className="px-6 py-3 border border-wine-300 text-wine-600 rounded-lg font-medium hover:bg-wine-50 transition-colors">
          로그인
        </button>
      </div>
    </form>
  );
} 