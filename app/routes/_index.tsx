import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getOrdersByUserId } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import { useNotifications } from "~/contexts/NotificationContext";
import { LoginForm } from "~/components/LoginForm";
import { SignupForm } from "~/components/SignupForm";
import ModalPortal from "~/components/ModalPortal";
import { HomeSkeleton } from "~/components/LoadingSkeleton";

// 교회소식 기본 예시 구조
const DEFAULT_NEWS = {
  registerNotice: "예수 그리스도 안에서 교회 등록을 원하시는 분은 예배 후 담임목사에게 말씀해 주세요.",
  events: [
    { title: "Wonder Kids 여름성경학교", date: "7/19(금)~20(토)", desc: "나는 하나님을 예배해요!" },
    { title: "King of Kings 캠프", date: "7/26(금)~27(토)", desc: "초등부, 중고등부 연합" }
  ],
  birthdays: [
    { name: "안현진", date: "07.13" },
    { name: "김종호", date: "07.15" },
    { name: "조익성", date: "07.19" }
  ],
  offeringAccounts: [
    { bank: "농협", number: "953301-00-074063", owner: "예수비전교회" },
    { bank: "농협", number: "301-0044-2043", owner: "예수비전교회" },
    { bank: "국민", number: "897001-00-014084", owner: "예수비전교회" }
  ],
  etc: "매월 생일축하, 새가족을 환영합니다."
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  // 교회소식 데이터 가져오기
  const { data: newsData, error: newsError } = await supabase
    .from('church_news')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  let news = DEFAULT_NEWS;
  if (!newsError && newsData && newsData.length > 0) {
    news = newsData[0].news;
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
  const [user, setUser] = useState<any>(outletContext?.user || null);
  const [userData, setUserData] = useState<any>(null);
  const [recentOrder, setRecentOrder] = useState<any>(null);

  // Safari 호환성을 위한 안전한 네비게이션 상태 체크
  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/") {
    return <HomeSkeleton />;
  }
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { toasts, initializeTTS } = useNotifications();
  
  // 디버깅: 알림 상태 로그
  useEffect(() => {
    console.log('🏠 홈탭 - 현재 toasts:', toasts);
  }, [toasts]);

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // outletContext에서 user가 바뀌면 즉시 반영
  useEffect(() => {
    if (outletContext?.user) {
      setUser(outletContext.user);
    }
  }, [outletContext?.user]);

  // 사용자 데이터 로딩 (프로필 + 최근 주문만, getUser 중복 호출 제거)
  useEffect(() => {
    if (!mounted) return;

    const loadUserData = async () => {
      // outletContext에서 이미 user가 있으면 그대로 사용 (getUser 재호출 불필요)
      const currentUser = outletContext?.user || user;

      if (!currentUser) {
        // outletContext에도 없으면 한번만 확인
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
            setUser(null);
            setLoading(false);
            return;
          }
          setUser(session.user);
          // currentUser 업데이트 후 아래 로직 계속 진행
          await loadAdditionalData(session.user);
        } catch {
          setLoading(false);
        }
        return;
      }

      await loadAdditionalData(currentUser);
    };

    const loadAdditionalData = async (currentUser: any) => {
      try {
        // 사용자 정보와 최근 주문을 병렬로 로딩
        const [userDataResult, recentOrderResult] = await Promise.allSettled([
          supabase.from('users')
            .select('role, name, email')
            .eq('id', currentUser.id)
            .single(),
          getOrdersByUserId(currentUser.id, 1)
        ]);

        if (userDataResult.status === 'fulfilled' && !userDataResult.value.error) {
          setUserData(userDataResult.value.data);
        }

        if (recentOrderResult.status === 'fulfilled' && recentOrderResult.value?.length > 0) {
          setRecentOrder(recentOrderResult.value[0]);
        }
      } catch (error) {
        console.error('❌ 홈탭 - 데이터 로딩 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [mounted, outletContext?.user]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 브랜드 헤더 스켈레톤 */}
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 스켈레톤 로딩 - 최근 주문 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-6 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                </div>
              </div>
            </div>
            
            {/* 교회소식 - Apple 스타일 디자인 (로딩 중에도 표시) */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl shadow-xl p-6 relative overflow-hidden">
                {/* 배경 장식 요소 */}
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-blue-200/25 to-purple-200/25 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-indigo-200/25 to-blue-200/25 rounded-full blur-2xl"></div>
                
                <div className="relative z-10">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-black text-gray-900 mb-1.5 tracking-tight">
                      교회 소식
                    </h2>
                    <p className="text-gray-600 text-sm font-medium">
                      하나님의 은혜가 함께하는 소식들
                    </p>
                  </div>
                  
                  {/* 2x2 그리드 패널 - 모든 화면에서 고정 */}
                  <div className="grid grid-cols-2 gap-3 max-w-none">
                    {/* 등록안내 패널 */}
                    {news?.registerNotice && (
                      <div className="bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="text-center mb-2.5">
                          <div className="w-7 h-7 bg-gradient-to-r from-wine-500 to-wine-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm">등록안내</h3>
                        </div>
                        <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line text-center">
                          {news?.registerNotice?.slice(0, 45)}...
                        </p>
                      </div>
                    )}
                    
                    {/* 행사일정 패널 */}
                    {news?.events && news.events.length > 0 && (
                      <div className="bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="text-center mb-2.5">
                          <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm">행사일정</h3>
                        </div>
                        <div className="space-y-1.5">
                          {news?.events?.slice(0, 1).map((ev: any, idx: number) => (
                            <div key={idx} className="bg-blue-50/60 rounded-lg p-1.5 text-center">
                              <h4 className="font-semibold text-blue-900 text-xs mb-0.5">{ev.title}</h4>
                              <p className="text-blue-700 text-xs">{ev.date}</p>
                            </div>
                          ))}
                          {news?.events && news.events.length > 1 && (
                            <div className="text-xs text-blue-600 font-medium text-center mt-1">
                              +{news?.events?.length - 1}개 더
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 생일축하 패널 */}
                    {news?.birthdays && news.birthdays.length > 0 && (
                      <div className="bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="text-center mb-2.5">
                          <div className="w-7 h-7 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm">생일축하</h3>
                        </div>
                        <div className="space-y-1">
                          {news?.birthdays?.slice(0, 2).map((b: any, idx: number) => (
                            <div key={idx} className="bg-green-50/60 rounded-lg p-1 text-center">
                              <p className="font-semibold text-green-900 text-xs">{b.name}</p>
                              <p className="text-green-600 text-xs">{b.date}</p>
                            </div>
                          ))}
                          {news?.birthdays && news.birthdays.length > 2 && (
                            <div className="text-xs text-green-600 font-medium text-center mt-1">
                              +{news?.birthdays?.length - 2}명 더
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* 헌금계좌 패널 */}
                    {news?.offeringAccounts && news.offeringAccounts.length > 0 && (
                      <div className="bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="text-center mb-2.5">
                          <div className="w-7 h-7 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm">헌금계좌</h3>
                        </div>
                        <div className="space-y-1">
                          {news?.offeringAccounts?.slice(0, 1).map((acc: any, idx: number) => (
                            <div key={idx} className="bg-purple-50/60 rounded-lg p-1.5 text-center">
                              <p className="font-semibold text-purple-900 text-xs">{acc.bank}</p>
                              <p className="text-purple-700 text-xs font-mono">{acc.number}</p>
                            </div>
                          ))}
                          {news?.offeringAccounts && news.offeringAccounts.length > 1 && (
                            <div className="text-xs text-purple-600 font-medium text-center mt-1">
                              +{news?.offeringAccounts?.length - 1}개 더
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 브랜드 및 사용자 정보 헤더 */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-wine rounded-xl flex items-center justify-center shadow-wine">
                <svg className="w-6 h-6 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-wine-800 leading-tight">
                  길을여는교회 이음카페
                </h1>
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                    Beta
                  </span>
                </div>
              </div>
            </div>
            
            {/* 사용자 정보 및 로그인 버튼 */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-wine-700 font-bold text-sm">
                      {user.email?.split('@')[0]}님
                    </div>
                    <div className="text-wine-600 text-xs">
                      안녕하세요
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await supabase.auth.signOut();
                        window.location.href = '/';
                      } catch (error) {
                        console.error('로그아웃 실패:', error);
                      }
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-medium transition-all text-xs"
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
                  className="bg-wine-100 hover:bg-wine-200 text-wine-700 px-4 py-2 rounded-lg font-bold transition-all text-sm"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* 교회소식 섹션 - 전체 너비 */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl shadow-xl p-6 relative overflow-hidden">
            {/* 배경 장식 요소 */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-blue-200/25 to-purple-200/25 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-indigo-200/25 to-blue-200/25 rounded-full blur-2xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-1.5 tracking-tight">
                  교회 소식
                </h2>
                <p className="text-gray-600 text-sm font-medium">
                  하나님의 은혜가 함께하는 소식들
                </p>
              </div>
              
              {/* 2x2 그리드 패널 - 모든 화면에서 고정 */}
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {/* 등록안내 패널 */}
                {news?.registerNotice && (
                  <div className="bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="text-center mb-2.5">
                      <div className="w-7 h-7 bg-gradient-to-r from-wine-500 to-wine-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">등록안내</h3>
                    </div>
                    <p className="text-gray-600 text-xs leading-relaxed whitespace-pre-line text-center">
                      {news?.registerNotice?.slice(0, 45)}...
                    </p>
                  </div>
                )}
                
                {/* 행사일정 패널 */}
                {news?.events && news.events.length > 0 && (
                  <div className="bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="text-center mb-2.5">
                      <div className="w-7 h-7 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">행사일정</h3>
                    </div>
                    <div className="space-y-1.5">
                      {news?.events?.slice(0, 1).map((ev: any, idx: number) => (
                        <div key={idx} className="bg-blue-50/60 rounded-lg p-1.5 text-center">
                          <h4 className="font-semibold text-blue-900 text-xs mb-0.5">{ev.title}</h4>
                          <p className="text-blue-700 text-xs">{ev.date}</p>
                        </div>
                      ))}
                      {news?.events && news.events.length > 1 && (
                        <div className="text-xs text-blue-600 font-medium text-center mt-1">
                          +{news?.events?.length - 1}개 더
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 생일축하 패널 */}
                {news?.birthdays && news.birthdays.length > 0 && (
                  <div className="bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="text-center mb-2.5">
                      <div className="w-7 h-7 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">생일축하</h3>
                    </div>
                    <div className="space-y-1">
                      {news?.birthdays?.slice(0, 2).map((b: any, idx: number) => (
                        <div key={idx} className="bg-green-50/60 rounded-lg p-1 text-center">
                          <p className="font-semibold text-green-900 text-xs">{b.name}</p>
                          <p className="text-green-600 text-xs">{b.date}</p>
                        </div>
                      ))}
                      {news?.birthdays && news.birthdays.length > 2 && (
                        <div className="text-xs text-green-600 font-medium text-center mt-1">
                          +{news?.birthdays?.length - 2}명 더
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 헌금계좌 패널 */}
                {news?.offeringAccounts && news.offeringAccounts.length > 0 && (
                  <div className="bg-white/75 backdrop-blur-sm rounded-2xl p-3.5 border border-white/60 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="text-center mb-2.5">
                      <div className="w-7 h-7 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-gray-900 text-sm">헌금계좌</h3>
                    </div>
                    <div className="space-y-1">
                      {news?.offeringAccounts?.slice(0, 1).map((acc: any, idx: number) => (
                        <div key={idx} className="bg-purple-50/60 rounded-lg p-1.5 text-center">
                          <p className="font-semibold text-purple-900 text-xs">{acc.bank}</p>
                          <p className="text-purple-700 text-xs font-mono">{acc.number}</p>
                        </div>
                      ))}
                      {news?.offeringAccounts && news.offeringAccounts.length > 1 && (
                        <div className="text-xs text-purple-600 font-medium text-center mt-1">
                          +{news?.offeringAccounts?.length - 1}개 더
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* 최근 주문 - 로그인 상태에 따라 다른 콘텐츠 */}
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">최근 주문</h2>
                {user && (
                  <Link
                    to="/recent"
                    className="text-wine-600 hover:text-wine-700 text-sm font-medium"
                  >
                    전체보기 →
                  </Link>
                )}
              </div>
              
              {user ? (
                // 로그인된 사용자 - 기존 주문 내역 표시
                recentOrder ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {recentOrder.church_group}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(recentOrder.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(recentOrder.status)}`}>
                        {getStatusLabel(recentOrder.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      {recentOrder.order_items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.menu?.name || '메뉴명 없음'}</span>
                          <span className="text-gray-500">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">
                        총 {recentOrder.total_amount.toLocaleString()}원
                      </span>
                      <Link
                        to="/recent"
                        className="text-wine-600 hover:text-wine-700 text-sm font-medium"
                      >
                        자세히 보기
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-4">아직 주문 내역이 없습니다.</div>
                    <Link
                      to="/orders/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-wine-600 hover:bg-wine-700"
                    >
                      첫 주문하기
                    </Link>
                  </div>
                )
              ) : (
                // 비로그인 사용자 - 로그인 유도
                <div className="text-center py-12">
                  <div className="mb-6">
                    <svg className="mx-auto h-16 w-16 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    주문 내역을 확인하려면 로그인이 필요합니다
                  </h3>
                  <p className="text-gray-600 mb-6">
                    이메일과 비밀번호로 로그인하고<br />주문 내역을 확인해보세요.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => setShowLogin(true)}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-wine-600 hover:bg-wine-700 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      로그인
                    </button>
                    <button
                      onClick={() => setShowSignup(true)}
                      className="inline-flex items-center px-6 py-3 border border-wine-600 text-wine-600 bg-white rounded-lg font-medium hover:bg-wine-50 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        
      </div>
      
      {/* 로그인 모달 */}
      {showLogin && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/60 z-[50000]"
            onClick={() => setShowLogin(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-2xl w-full max-w-xs sm:max-w-md"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold z-10"
              onClick={() => setShowLogin(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-wine-800 mb-4 text-center">로그인</h2>
            <LoginForm 
              onSwitchToSignup={() => {
                setShowLogin(false);
                setShowSignup(true);
              }} 
              onLoginSuccess={() => {
                setShowLogin(false);
                setLoginSuccess(true);
                // 짧은 피드백 후 리로드 (인위적 딜레이 제거)
                setTimeout(() => {
                  setLoginSuccess(false);
                  window.location.reload();
                }, 300);
              }} 
            />
          </div>
        </ModalPortal>
      )}
      
      {/* 회원가입 모달 */}
      {showSignup && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/60 z-[50000]"
            onClick={() => setShowSignup(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-2xl w-full max-w-xs sm:max-w-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold z-10"
              onClick={() => setShowSignup(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-wine-800 mb-4 text-center">회원가입</h2>
            <SignupForm 
              onSwitchToLogin={() => {
                setShowSignup(false);
                setShowLogin(true);
              }} 
            />
          </div>
        </ModalPortal>
      )}
      
      {/* 로그인 성공 메시지 */}
      {loginSuccess && (
        <div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[99999] bg-green-100 border border-green-400 text-green-700 px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-2xl animate-fade-in font-bold text-sm sm:text-lg">
          로그인 되었습니다
        </div>
      )}
    </div>
  );
}
