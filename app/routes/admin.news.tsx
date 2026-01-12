import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { createServerClient } from "@supabase/ssr";
import { supabase as clientSupabase } from "~/lib/supabase";

// 교회소식 기본 예시 구조 (2026.01.11 주보 기준)
const DEFAULT_NEWS = {
  registerNotice: "예수 그리스도 안에서 교회 등록을 원하시는 분은 예배 후 담임목사에게 말씀해 주세요.",
  events: [
    { title: "정기제직회", date: "1/11(주일) 오후 3시", desc: "" },
    { title: "공동의회(사무처리회)", date: "1/18(주일) 2부 예배 직후", desc: "예배당" },
    { title: "목장 방학", date: "1/11(주일)~1/31(토)", desc: "3주간 / 2월 1일 개강" },
    { title: "'길 학교' 개강", date: "1/11, 18, 25일", desc: "주일 중식 직후 1:30~3:00 / 전교인 대상" },
    { title: "결혼 - 김주은 ♥ 권가람", date: "1/17(토) 오전 11시", desc: "더화이트베이W홀 4층(서울 서초) / 김희환 장로-김연태 권사의 딸" },
    { title: "결혼 - 오승현 ♥ 나윤희", date: "1/17(토) 오전 11시", desc: "남악 스카이웨딩컨벤션(남악) / 바나바 목장" }
  ],
  birthdays: [],
  offeringAccounts: [
    { bank: "국민", number: "359301-04-070463", owner: "길을여는교회" },
    { bank: "국민", number: "897001-00-044203", owner: "길을여는교회 (구제/선교)" },
    { bank: "국민", number: "897001-00-014048", owner: "길을여는교회 (건축)" }
  ],
  etc: "사역 팀원 모집: 신청서는 로비에 비치 되어 있습니다. (중보기도팀, 전도팀, 시설팀, 찬양팀, 새가족팀, 방송음향팀, 성가대, 아미키즈 & 예스키즈 목자)\n기부금영수증 발급신청서: 로비에 비치되어 있습니다."
};

export async function loader({ request }: LoaderFunctionArgs) {
  // 클라이언트 사이드에서 인증을 처리하도록 기본 데이터만 반환
  return json({ news: DEFAULT_NEWS });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const intent = formData.get('intent');

    // 서버에서는 service role key를 사용하여 직접 DB 접근
    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
        },
      }
    );

    if (intent === 'delete') {
      // id가 'singleton'인 데이터를 삭제합니다.
      const { error } = await supabase.from('church_news').delete().eq('id', 'singleton');
      if (error) {
        console.error('Database error:', error);
        return json({ success: false, error: '삭제에 실패했습니다.' }, { status: 500 });
      }
      return json({ success: true, message: '삭제가 완료되었습니다.' });
    }

    if (intent === 'save') {
      const news = JSON.parse(formData.get('news') as string);
      const { error } = await supabase
        .from('church_news')
        .upsert(
          { 
            id: 'singleton', 
            news, 
            updated_at: new Date().toISOString() 
          }, 
          { onConflict: 'id' }
        );
      
      if (error) {
        console.error('Database error:', error);
        return json({ success: false, error: '저장에 실패했습니다.' }, { status: 500 });
      }
      return json({ success: true, message: '저장이 완료되었습니다.' });
    }

    return json({ success: false, error: '잘못된 요청입니다.' }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return json({ success: false, error: '처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export default function AdminNewsPage() {
  const { news } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [form, setForm] = useState(news);
  const [preview, setPreview] = useState(news);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 인증 확인
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await clientSupabase.auth.getUser();
        
        if (!user) {
          navigate('/other');
          return;
        }
        
        setUser(user);
        
        // 사용자 역할 확인
        const { data: userData, error: userError } = await clientSupabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (userError || userData?.role !== 'admin') {
          alert('관리자만 접근할 수 있습니다.');
          navigate('/other');
          return;
        }
        
        setUserRole(userData.role);
        
        // 실제 교회소식 데이터 로드
        const { data: newsData, error: newsError } = await clientSupabase
          .from('church_news')
          .select('*')
          .eq('id', 'singleton')
          .single();
        
        if (!newsError && newsData) {
          setForm(newsData.news);
          setPreview(newsData.news);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/other');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    setPreview(form);
  }, [form]);

  // 저장 완료/실패 처리
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      const data = fetcher.data as { success?: boolean; error?: string };
      if (data.success) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000); // 3초 후 자동 숨김
      }
    }
  }, [fetcher.state, fetcher.data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-wine-600"></div>
          <span>권한 확인 중...</span>
        </div>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return null; // 이미 리다이렉트 처리됨
  }

  return (
    <div className="min-h-screen bg-ivory-50 py-10 px-4 flex flex-col items-center">
      {/* 성공 메시지 팝업 */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span>저장이 완료되었습니다!</span>
          </div>
        </div>
      )}

      {/* 로딩 오버레이 */}
      {fetcher.state === 'submitting' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-wine-600"></div>
            <span>저장 중...</span>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 mb-8">
        <h1 className="text-2xl font-bold text-wine-800 mb-6 text-center">교회소식 관리</h1>
        <fetcher.Form method="post" className="space-y-6">
          {/* 등록안내 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">등록안내</label>
            <textarea
              className="w-full border rounded-lg p-2"
              rows={2}
              value={form.registerNotice}
              onChange={e => setForm({ ...form, registerNotice: e.target.value })}
              name="registerNotice"
            />
          </div>
          {/* 행사/캠프 일정 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">행사/캠프 일정</label>
            {form.events.map((ev: any, idx: number) => (
              <div key={idx} className="mb-4 border rounded-lg p-3 bg-ivory-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">행사명</label>
                    <input
                      className="border rounded p-1 flex-1"
                      value={ev.title}
                      onChange={e => {
                        const events = [...form.events];
                        events[idx].title = e.target.value;
                        setForm({ ...form, events });
                      }}
                      placeholder="행사명"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">일정</label>
                    <input
                      className="border rounded p-1 w-full"
                      value={ev.date}
                      onChange={e => {
                        const events = [...form.events];
                        events[idx].date = e.target.value;
                        setForm({ ...form, events });
                      }}
                      placeholder="날짜"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">행사내용</label>
                    <input
                      className="border rounded p-1 w-full"
                      value={ev.desc}
                      onChange={e => {
                        const events = [...form.events];
                        events[idx].desc = e.target.value;
                        setForm({ ...form, events });
                      }}
                      placeholder="설명"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button type="button" className="text-red-500 text-sm" onClick={() => {
                    const events = form.events.filter((_: any, i: number) => i !== idx);
                    setForm({ ...form, events });
                  }}>삭제</button>
                </div>
              </div>
            ))}
            <div className="flex justify-center mt-4">
              <button 
                type="button" 
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold transition-colors flex items-center gap-2" 
                onClick={() => setForm({ ...form, events: [...form.events, { title: '', date: '', desc: '' }] })}
              >
                <span className="text-xl">+</span>
                <span>행사 추가</span>
              </button>
            </div>
          </div>
          {/* 생일자 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">생일자</label>
            {form.birthdays.map((b: any, idx: number) => (
              <div key={idx} className="mb-4 border rounded-lg p-3 bg-ivory-100">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">성명</label>
                    <input
                      className="border rounded p-1 w-full"
                      value={b.name}
                      onChange={e => {
                        const birthdays = [...form.birthdays];
                        birthdays[idx].name = e.target.value;
                        setForm({ ...form, birthdays });
                      }}
                      placeholder="이름"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">일자</label>
                    <input
                      className="border rounded p-1 w-full"
                      value={b.date}
                      onChange={e => {
                        const birthdays = [...form.birthdays];
                        birthdays[idx].date = e.target.value;
                        setForm({ ...form, birthdays });
                      }}
                      placeholder="날짜"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button type="button" className="text-red-500 text-sm" onClick={() => {
                    const birthdays = form.birthdays.filter((_: any, i: number) => i !== idx);
                    setForm({ ...form, birthdays });
                  }}>삭제</button>
                </div>
              </div>
            ))}
            <div className="flex justify-center mt-4">
              <button 
                type="button" 
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold transition-colors flex items-center gap-2" 
                onClick={() => setForm({ ...form, birthdays: [...form.birthdays, { name: '', date: '' }] })}
              >
                <span className="text-xl">+</span>
                <span>생일자 추가</span>
              </button>
            </div>
          </div>
          {/* 헌금계좌 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">헌금계좌</label>
            {form.offeringAccounts.map((acc: any, idx: number) => (
              <div key={idx} className="mb-4 border rounded-lg p-3 bg-ivory-100">
                <div className="flex flex-col gap-2 mb-2">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">계좌번호</label>
                    <input
                      className="border rounded p-1 w-full"
                      value={acc.number}
                      onChange={e => {
                        const offeringAccounts = [...form.offeringAccounts];
                        offeringAccounts[idx].number = e.target.value;
                        setForm({ ...form, offeringAccounts });
                      }}
                      placeholder="계좌번호"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">은행명</label>
                    <input
                      className="border rounded p-1 w-full"
                      value={acc.bank}
                      onChange={e => {
                        const offeringAccounts = [...form.offeringAccounts];
                        offeringAccounts[idx].bank = e.target.value;
                        setForm({ ...form, offeringAccounts });
                      }}
                      placeholder="은행"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">계좌명</label>
                    <input
                      className="border rounded p-1 w-full"
                      value={acc.owner}
                      onChange={e => {
                        const offeringAccounts = [...form.offeringAccounts];
                        offeringAccounts[idx].owner = e.target.value;
                        setForm({ ...form, offeringAccounts });
                      }}
                      placeholder="예금주"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <button type="button" className="text-red-500 text-sm" onClick={() => {
                    const offeringAccounts = form.offeringAccounts.filter((_: any, i: number) => i !== idx);
                    setForm({ ...form, offeringAccounts });
                  }}>삭제</button>
                </div>
              </div>
            ))}
            <div className="flex justify-center mt-4">
              <button 
                type="button" 
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-6 py-3 font-semibold transition-colors flex items-center gap-2" 
                onClick={() => setForm({ ...form, offeringAccounts: [...form.offeringAccounts, { bank: '', number: '', owner: '' }] })}
              >
                <span className="text-xl">+</span>
                <span>계좌 추가</span>
              </button>
            </div>
          </div>
          {/* 기타 공지 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">기타 공지</label>
            <textarea
              className="w-full border rounded-lg p-2"
              rows={2}
              value={form.etc}
              onChange={e => setForm({ ...form, etc: e.target.value })}
              name="etc"
            />
          </div>
          <input type="hidden" name="news" value={JSON.stringify(form)} />
          <input type="hidden" name="intent" value="save" />
          <button 
            type="submit" 
            disabled={fetcher.state === 'submitting'}
            className={`w-full py-3 px-4 rounded-lg font-bold transition-colors ${
              fetcher.state === 'submitting' 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-wine-600 text-white hover:bg-wine-700'
            }`}
          >
            {fetcher.state === 'submitting' ? '저장 중...' : '저장'}
          </button>
        </fetcher.Form>
      </div>
      {/* 미리보기 */}
      <div className="w-full max-w-2xl bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-wine-700 mb-4">교회소식 미리보기</h2>
        <div className="border-b pb-2 mb-2">
          <span className="font-bold text-wine-700">등록안내</span>
          <div className="text-gray-700 mt-1 whitespace-pre-line">{preview.registerNotice}</div>
        </div>
        <div className="border-b pb-2 mb-2">
          <span className="font-bold text-wine-700">행사/캠프 일정</span>
          <ul className="mt-1 space-y-1">
            {preview.events.map((ev: any, idx: number) => (
              <li key={idx} className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">{ev.title}</span>
                <span className="text-xs text-gray-500">{ev.date}</span>
                <span className="text-xs text-gray-500">{ev.desc}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-b pb-2 mb-2">
          <span className="font-bold text-wine-700">생일자</span>
          <ul className="mt-1 space-y-1">
            {preview.birthdays.map((b: any, idx: number) => (
              <li key={idx} className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">{b.name}</span>
                <span className="text-xs text-gray-500">{b.date}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-b pb-2 mb-2">
          <span className="font-bold text-wine-700">헌금계좌 안내</span>
          <ul className="mt-1 space-y-1">
            {preview.offeringAccounts.map((acc: any, idx: number) => (
              <li key={idx} className="flex items-center gap-2 text-gray-700">
                <span className="font-semibold">{acc.bank}</span>
                <span className="text-xs text-gray-500">{acc.number}</span>
                <span className="text-xs text-gray-500">{acc.owner}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pt-2">
          <span className="font-bold text-wine-700">기타 공지</span>
          <div className="text-gray-700 mt-1 whitespace-pre-line">{preview.etc}</div>
        </div>
      </div>
    </div>
  );
} 