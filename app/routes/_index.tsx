import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";
import { getOrdersByUserId } from "~/lib/database";
import { signOutAndClearSession } from "~/lib/authClient";
import { useNotifications } from "~/contexts/NotificationContext";
import { LoginForm } from "~/components/LoginForm";
import { SignupForm } from "~/components/SignupForm";
import ModalPortal from "~/components/ModalPortal";
import { HomeSkeleton } from "~/components/LoadingSkeleton";

// 교회소식 기본값 (2026.05.03 주보 기준)
const DEFAULT_NEWS = {
  registerNotice: "",
  events: [
    { title: "5/03 주일예배 — 온세대통합예배", date: "5/03(주일) 오전 11시", desc: "" },
    { title: "5/05(화) 새벽예배 없음", date: "5/05(화)", desc: "" },
    { title: "예비목자교육", date: "5/10(주일) 오후 2:30 개강 ~ 6/07(주일) 종강", desc: "5회" },
    { title: "전교인 수련회", date: "8/28(금) ~ 8/30(주일)", desc: "국립나주숲체원" },
  ],
  birthdays: [],
  offeringAccounts: [
    { bank: "국민", number: "359301-04-070463", owner: "길을여는교회" },
    { bank: "국민", number: "897001-00-044203", owner: "구제 / 선교" },
    { bank: "국민", number: "897001-00-014048", owner: "건축" },
  ],
  etc: "초등부(아미/예스키즈) 목자 모집 (문의: 차지영 집사)\n매일성경 5-6월호: 로비에 비치되어 있습니다",
};


export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  // 교회소식 데이터를 가져오기 (속도 개선)
  const [newsResult] = await Promise.allSettled([
    // 교회소식 데이터
    supabase
      .from('church_news')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
  ]);

  // 교회소식 처리
  let news = DEFAULT_NEWS;
  if (newsResult.status === 'fulfilled' && !newsResult.value.error && newsResult.value.data?.length > 0) {
    news = newsResult.value.data[0].news as typeof DEFAULT_NEWS;
  }

  return json({
    error,
    success,
    news
  });
}

export default function Index() {
  const { error, success, news } = useLoaderData<typeof loader>();
  const outletContext = useOutletContext<{ user: any; userRole: string | null }>();
  const navigation = useNavigation();
  const [recentOrder, setRecentOrder] = useState<any>(null);

  const [userDataLoading, setUserDataLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const user = outletContext?.user || null;
  const userRole = outletContext?.userRole || null;

  // 교회소식 상태 (서버 데이터로 초기화, 저장 후 즉시 반영용)
  const [newsData, setNewsData] = useState<any>(news);
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [newsEditForm, setNewsEditForm] = useState<any>(null);
  const [newsSaving, setNewsSaving] = useState(false);

  const startEditingNews = useCallback(() => {
    setNewsEditForm(JSON.parse(JSON.stringify(newsData)));
    setIsEditingNews(true);
  }, [newsData]);

  const cancelEditingNews = () => {
    setIsEditingNews(false);
    setNewsEditForm(null);
  };

  const saveNews = async () => {
    setNewsSaving(true);
    try {
      const res = await fetch('/api/update-church-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news: newsEditForm }),
      });
      const data = await res.json();
      if (data.success) {
        setNewsData(newsEditForm);
        setIsEditingNews(false);
        setNewsEditForm(null);
      } else {
        alert('저장에 실패했습니다: ' + (data.error || ''));
      }
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setNewsSaving(false);
    }
  };
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { toasts, initializeTTS, showNotification } = useNotifications();

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // 에러 및 성공 메시지 처리
  useEffect(() => {
    if (error) {
      console.error('OAuth 오류:', error);

      // OAuth 관련 오류 메시지 개선
      let errorMessage = error;
      if (error.includes('Invalid API key') || error.includes('Invalid API key')) {
        errorMessage = 'OAuth 설정이 완료되지 않았습니다. Supabase에서 Google/Kakao Provider를 활성화해주세요.';
      } else if (error.includes('invalid_grant')) {
        errorMessage = '로그인 요청이 만료되었습니다. 다시 시도해주세요.';
      } else if (error.includes('access_denied')) {
        errorMessage = '로그인이 취소되었습니다.';
      }

      showNotification(errorMessage, 'error');

      // URL에서 에러 파라미터 제거
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.toString());
    }

    if (success) {
      showNotification(success, 'success');

      // URL에서 성공 파라미터 제거
      const url = new URL(window.location.href);
      url.searchParams.delete('success');
      window.history.replaceState({}, '', url.toString());
    }
  }, [error, success, showNotification]);

  // 최근 주문 로딩
  useEffect(() => {
    if (!mounted || !user) return;

    setUserDataLoading(true);
    getOrdersByUserId(user.id, 1)
      .then(orders => setRecentOrder(orders?.[0] || null))
      .catch(() => setRecentOrder(null))
      .finally(() => setUserDataLoading(false));
  }, [mounted, user]);

  // Safari 호환성을 위한 안전한 네비게이션 상태 체크 (모든 훅 호출 후에 조건부 return)
  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/") {
    return <HomeSkeleton />;
  }

  if (!mounted) {
    return null;
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기중';
      case 'preparing': return '제조중';
      case 'ready': return '제조완료';
      case 'completed': return '픽업완료';
      case 'cancelled': return '취소';
      default: return '대기중';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-secondary-bg text-body';
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* 브랜드 및 사용자 정보 헤더 - 여백 최소화 */}
        <div className="mb-3 sm:mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center border-2 border-primary-pressed">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-ink leading-tight">
                  길을여는교회 이음카페
                </h1>
                <div className="flex items-center gap-2">
                  <span className="bg-primary text-white text-xs px-2 py-1 rounded-full font-bold border border-primary-pressed">
                    Beta
                  </span>
                </div>
              </div>
            </div>

            {/* 사용자 정보 및 로그인 버튼 */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link
                    to="/mypage"
                    className="text-right rounded-2xl px-2 py-1 transition-colors hover:bg-surface-soft focus:outline-none focus:ring-2 focus:ring-focus-outer"
                    aria-label="마이페이지로 이동"
                  >
                    <div className="text-body font-bold text-sm">
                      {user.email?.split('@')[0]}님
                    </div>
                    <div className="text-mute text-xs">
                      안녕하세요
                    </div>
                  </Link>
                  <button
                    onClick={async () => {
                      try {
                        await signOutAndClearSession();
                        window.location.replace('/');
                      } catch (error) {
                        console.error('로그아웃 실패:', error);
                      }
                    }}
                    className="bg-surface-soft hover:bg-surface-card text-body border border-stone px-3 py-1 rounded-2xl font-medium transition-all text-xs"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    initializeTTS();
                    setShowLogin(true);
                  }}
                  className="bg-primary hover:bg-primary-pressed text-white border-2 border-primary-pressed px-4 py-2 rounded-2xl font-bold transition-all text-sm"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 교회소식 섹션 */}
        <div className="mb-3 sm:mb-4">
          <div className="bg-canvas border-2 border-hairline-soft rounded-2xl overflow-hidden">

            {/* 헤더 — 진한 배경으로 강한 인상 */}
            <div className="relative bg-charcoal px-4 pt-4 pb-5 overflow-hidden">
              {/* 장식용 원형 그라데이션 */}
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-wine-600 opacity-20 pointer-events-none" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-wine-700 opacity-10 pointer-events-none" />

              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-wine-400 text-xs font-bold tracking-widest uppercase mb-0.5">길을여는교회</p>
                  <h2 className="text-xl font-black text-white tracking-tight leading-tight">교회 소식</h2>
                  <p className="text-stone text-xs mt-1">하나님의 은혜가 함께하는 소식들</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {userRole === 'admin' && !isEditingNews && (
                    <button
                      onClick={startEditingNews}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors backdrop-blur-sm"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      편집
                    </button>
                  )}
                  {isEditingNews && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={cancelEditingNews}
                        className="px-2.5 py-1.5 bg-white/10 text-white border border-white/20 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={saveNews}
                        disabled={newsSaving}
                        className="px-2.5 py-1.5 bg-wine-600 text-white rounded-lg text-xs font-bold hover:bg-wine-700 disabled:opacity-50 transition-colors"
                      >
                        {newsSaving ? '저장 중…' : '저장'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isEditingNews ? (
              /* ===== 표시 모드 ===== */
              <div className="p-3">
                {/* 생일축하 (있을 때만 상단에) */}
                {newsData?.birthdays && newsData.birthdays.length > 0 && (
                  <div className="rounded-xl border border-hairline bg-surface-soft px-3.5 py-3 mb-2.5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-1 h-4 bg-wine-600 rounded-full flex-shrink-0" />
                      <span className="text-xs font-black text-wine-600 tracking-wider uppercase">생일 축하</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newsData.birthdays.map((b: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-canvas border border-hairline rounded-xl px-3 py-2">
                          <div className="w-7 h-7 rounded-full bg-wine-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                            {b.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-ink-soft text-sm leading-none">{b.name}</p>
                            <p className="text-mute text-xs mt-0.5">{b.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2열 그리드: 왼쪽=행사일정, 오른쪽=헌금+기타 */}
                <div className="grid grid-cols-2 gap-2.5 items-start">

                  {/* 왼쪽 열: 행사일정 */}
                  {newsData?.events && newsData.events.length > 0 && (
                    <div className="rounded-xl border border-hairline bg-surface-soft px-3 py-3 h-full">
                      <div className="flex items-center gap-1.5 mb-2.5">
                        <span className="w-1 h-4 bg-wine-600 rounded-full flex-shrink-0" />
                        <span className="text-xs font-black text-wine-600 tracking-wider uppercase">행사</span>
                        <span className="ml-auto bg-wine-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">{newsData.events.length}</span>
                      </div>
                      <div className="space-y-2">
                        {newsData.events.map((ev: any, idx: number) => (
                          <div key={idx} className="bg-canvas rounded-xl px-2.5 py-2 border border-hairline">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="w-4 h-4 rounded-full bg-wine-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 leading-none">{idx + 1}</span>
                              <p className="font-bold text-ink-soft text-xs leading-tight">{ev.title}</p>
                            </div>
                            {ev.date && <p className="text-wine-600 text-xs font-semibold pl-5">{ev.date}</p>}
                            {ev.desc && <p className="text-mute text-xs leading-relaxed pl-5 mt-0.5">{ev.desc}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 오른쪽 열: 헌금계좌 + 기타안내 */}
                  <div className="space-y-2.5">
                    {/* 헌금계좌 */}
                    {newsData?.offeringAccounts && newsData.offeringAccounts.length > 0 && (
                      <div className="rounded-xl border border-hairline bg-surface-soft px-3 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1 h-4 bg-wine-600 rounded-full flex-shrink-0" />
                          <span className="text-xs font-black text-wine-600 tracking-wider uppercase">헌금</span>
                        </div>
                        <div className="space-y-1.5">
                          {newsData.offeringAccounts.map((acc: any, idx: number) => (
                            <div key={idx} className="bg-canvas border border-hairline rounded-xl px-2.5 py-2">
                              <span className="bg-charcoal text-white text-xs font-black px-2 py-0.5 rounded-md">{acc.bank}</span>
                              <p className="text-ink-soft text-xs font-mono mt-1 leading-none">{acc.number}</p>
                              {acc.owner && <p className="text-mute text-xs mt-0.5 leading-tight">{acc.owner}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 기타안내 */}
                    {newsData?.etc && (
                      <div className="rounded-xl border border-hairline bg-surface-soft px-3 py-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-1 h-4 bg-wine-600 rounded-full flex-shrink-0" />
                          <span className="text-xs font-black text-wine-600 tracking-wider uppercase">기타</span>
                        </div>
                        <p className="text-body text-xs leading-relaxed whitespace-pre-line">{newsData.etc}</p>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              /* ===== 편집 모드 (관리자 전용) ===== */
              <div className="divide-y divide-hairline p-4 space-y-5">

                {/* 행사일정 편집 */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-ink">행사 일정</label>
                    <button
                      type="button"
                      onClick={() => setNewsEditForm((f: any) => ({ ...f, events: [...(f.events || []), { title: '', date: '', desc: '' }] }))}
                      className="text-xs text-wine-600 font-bold hover:text-wine-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(newsEditForm?.events || []).map((ev: any, idx: number) => (
                      <div key={idx} className="bg-surface-soft rounded-xl p-2.5 space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            value={ev.title}
                            onChange={e => setNewsEditForm((f: any) => ({ ...f, events: f.events.map((x: any, i: number) => i === idx ? { ...x, title: e.target.value } : x) }))}
                            placeholder="행사명"
                            className="flex-1 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                          />
                          <button
                            type="button"
                            onClick={() => setNewsEditForm((f: any) => ({ ...f, events: f.events.filter((_: any, i: number) => i !== idx) }))}
                            className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                          >
                            삭제
                          </button>
                        </div>
                        <input
                          value={ev.date}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, events: f.events.map((x: any, i: number) => i === idx ? { ...x, date: e.target.value } : x) }))}
                          placeholder="날짜 (예: 1/11(주일) 오후 3시)"
                          className="w-full px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                        <input
                          value={ev.desc}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, events: f.events.map((x: any, i: number) => i === idx ? { ...x, desc: e.target.value } : x) }))}
                          placeholder="설명 (선택)"
                          className="w-full px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 생일축하 편집 */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-ink">생일 축하</label>
                    <button
                      type="button"
                      onClick={() => setNewsEditForm((f: any) => ({ ...f, birthdays: [...(f.birthdays || []), { name: '', date: '' }] }))}
                      className="text-xs text-wine-600 font-bold hover:text-wine-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(newsEditForm?.birthdays || []).map((b: any, idx: number) => (
                      <div key={idx} className="flex gap-1.5">
                        <input
                          value={b.name}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, birthdays: f.birthdays.map((x: any, i: number) => i === idx ? { ...x, name: e.target.value } : x) }))}
                          placeholder="이름"
                          className="flex-1 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                        <input
                          value={b.date}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, birthdays: f.birthdays.map((x: any, i: number) => i === idx ? { ...x, date: e.target.value } : x) }))}
                          placeholder="날짜 (예: 07.13)"
                          className="flex-1 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                        <button
                          type="button"
                          onClick={() => setNewsEditForm((f: any) => ({ ...f, birthdays: f.birthdays.filter((_: any, i: number) => i !== idx) }))}
                          className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 헌금계좌 편집 */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-ink">헌금 계좌</label>
                    <button
                      type="button"
                      onClick={() => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: [...(f.offeringAccounts || []), { bank: '', number: '', owner: '' }] }))}
                      className="text-xs text-wine-600 font-bold hover:text-wine-800"
                    >
                      + 추가
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(newsEditForm?.offeringAccounts || []).map((acc: any, idx: number) => (
                      <div key={idx} className="bg-surface-soft rounded-xl p-2.5 space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            value={acc.bank}
                            onChange={e => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: f.offeringAccounts.map((x: any, i: number) => i === idx ? { ...x, bank: e.target.value } : x) }))}
                            placeholder="은행 (예: 국민)"
                            className="w-20 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                          />
                          <input
                            value={acc.number}
                            onChange={e => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: f.offeringAccounts.map((x: any, i: number) => i === idx ? { ...x, number: e.target.value } : x) }))}
                            placeholder="계좌번호"
                            className="flex-1 px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                          />
                          <button
                            type="button"
                            onClick={() => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: f.offeringAccounts.filter((_: any, i: number) => i !== idx) }))}
                            className="px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs"
                          >
                            삭제
                          </button>
                        </div>
                        <input
                          value={acc.owner}
                          onChange={e => setNewsEditForm((f: any) => ({ ...f, offeringAccounts: f.offeringAccounts.map((x: any, i: number) => i === idx ? { ...x, owner: e.target.value } : x) }))}
                          placeholder="예금주 (예: 길을여는교회)"
                          className="w-full px-2 py-1.5 border-2 border-wine-100 rounded-lg text-xs focus:outline-none focus:border-wine-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 기타안내 편집 */}
                <div className="pt-4">
                  <label className="block text-sm font-bold text-ink mb-1.5">기타 안내</label>
                  <textarea
                    value={newsEditForm?.etc || ''}
                    onChange={e => setNewsEditForm((f: any) => ({ ...f, etc: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border-2 border-wine-100 rounded-xl text-sm focus:outline-none focus:border-wine-400 resize-none"
                    placeholder="기타 안내 사항 (줄바꿈 지원)"
                  />
                </div>

              </div>
            )}
          </div>
        </div>

        {/* 최근 주문 섹션 - 여백 최소화 */}
        <div className="mb-3 sm:mb-4">
          <div className="bg-white border-2 border-hairline-soft rounded-2xl p-3 sm:p-4">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-ink">최근 주문</h2>
              {user && (
                <Link
                  to="/orders/history"
                  className="text-mute hover:text-body text-sm font-medium"
                >
                  전체보기 →
                </Link>
              )}
            </div>

            {userDataLoading ? (
              // 로딩 중 - 스켈레톤 표시
              <div className="space-y-3 py-4">
                <div className="h-4 bg-surface-card rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-surface-card rounded w-1/2 animate-pulse"></div>
                <div className="h-4 bg-surface-card rounded w-2/3 animate-pulse"></div>
              </div>
            ) : user ? (
              // 로그인된 사용자 - 기존 주문 내역 표시
              recentOrder ? (
                <div className="border-2 border-hairline-soft rounded-2xl p-3 bg-canvas">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-ink text-sm sm:text-base">
                        {recentOrder.church_group}
                      </h3>
                      <p className="text-xs sm:text-sm text-mute">
                        {new Date(recentOrder.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(recentOrder.status)}`}>
                      {getStatusLabel(recentOrder.status)}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-2">
                    {recentOrder.order_items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-xs sm:text-sm text-body">
                        <span>{item.menu?.name || '메뉴명 없음'}</span>
                        <span className="text-mute">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t-2 border-hairline">
                    <span className="font-semibold text-ink text-sm sm:text-base">
                      총 {recentOrder.total_amount.toLocaleString()}원
                    </span>
                    <Link
                      to="/orders/history"
                      className="text-mute hover:text-body text-xs sm:text-sm font-medium"
                    >
                      자세히 보기
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <div className="text-mute mb-3 sm:mb-4 text-sm">아직 주문 내역이 없습니다.</div>
                  <Link
                    to="/orders/new"
                    className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-primary text-mute bg-white hover:bg-surface-soft text-xs sm:text-sm font-medium rounded-2xl transition-colors"
                  >
                    첫 주문하기
                  </Link>
                </div>
              )
            ) : (
              // 비로그인 사용자 - 로그인 유도, 여백 최소화
              <div className="text-center py-6 sm:py-8">
                <div className="mb-4 sm:mb-5">
                  <svg className="mx-auto h-12 w-12 sm:h-14 sm:w-14 text-stone" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" />
                  </svg>
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-ink mb-1.5 sm:mb-2">
                  주문 내역을 확인하려면 로그인이 필요합니다
                </h3>
                <p className="text-mute mb-4 sm:mb-5 text-xs sm:text-sm">
                  이메일과 비밀번호로 로그인하고<br />주문 내역을 확인해보세요.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-primary text-sm sm:text-base font-medium rounded-2xl text-white bg-primary hover:bg-primary-pressed transition-colors"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    로그인
                  </button>
                  <button
                    onClick={() => setShowSignup(true)}
                    className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-primary text-mute bg-white rounded-2xl font-medium hover:bg-canvas transition-colors text-sm sm:text-base"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    회원가입
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 로그인 모달 - 그림자 없이 깔끔한 디자인 */}
      {showLogin && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/50 z-[50000]"
            onClick={() => setShowLogin(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-hairline rounded-2xl p-6 w-full max-w-xs sm:max-w-md"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-ash hover:text-body text-xl font-bold z-10"
              onClick={() => setShowLogin(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-ink mb-4 text-center">로그인</h2>
            <LoginForm
              onSwitchToSignup={() => {
                setShowLogin(false);
                setShowSignup(true);
              }}
              onLoginSuccess={() => {
                console.log('✅ 홈탭 로그인 성공 - 세션 확인 후 리다이렉트');
                setShowLogin(false);
                setLoginSuccess(true);
                setTimeout(() => {
                  setLoginSuccess(false);
                  window.location.href = '/';
                }, 1000);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {/* 회원가입 모달 - 그림자 없이 깔끔한 디자인 */}
      {showSignup && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/50 z-[50000]"
            onClick={() => setShowSignup(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-hairline rounded-2xl p-6 w-full max-w-xs sm:max-w-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-ash hover:text-body text-xl font-bold z-10"
              onClick={() => setShowSignup(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-ink mb-4 text-center">회원가입</h2>
            <SignupForm
              onSwitchToLogin={() => {
                setShowSignup(false);
                setShowLogin(true);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {/* 로그인 성공 메시지 - 그림자 없이 깔끔한 디자인 */}
      {loginSuccess && (
        <div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[99999] bg-surface-soft border-2 border-stone text-body px-4 sm:px-6 py-3 sm:py-4 rounded-2xl animate-fade-in font-bold text-sm sm:text-lg">
          로그인 되었습니다
        </div>
      )}
    </div>
  );
}
