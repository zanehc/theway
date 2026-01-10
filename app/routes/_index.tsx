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

  // 특정 설교 영상 정보 (YouTube Data API로 썸네일 가져오기)
  // 영상 ID: m3fB9E6snuU (https://www.youtube.com/live/m3fB9E6snuU)
  const VIDEO_ID = 'm3fB9E6snuU';
  let latestVideo = {
    videoId: VIDEO_ID,
    title: '26년 01월 04일 설교영상',
    thumbnail: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg` // hqdefault가 더 안정적
  };

  // YouTube Data API로 실제 썸네일 가져오기 (선택적)
  try {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (YOUTUBE_API_KEY) {
      // 타임아웃 제어
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const videoResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${VIDEO_ID}&part=snippet`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      
      if (videoResponse.ok) {
        const videoData = await videoResponse.json();
        if (videoData.items && videoData.items.length > 0) {
          const snippet = videoData.items[0].snippet;
          // 최고 품질 썸네일 우선순위로 선택
          latestVideo = {
            videoId: VIDEO_ID,
            title: snippet.title || '26년 01월 04일 설교영상',
            thumbnail: snippet.thumbnails?.maxres?.url || 
                      snippet.thumbnails?.high?.url || 
                      snippet.thumbnails?.medium?.url || 
                      snippet.thumbnails?.standard?.url ||
                      snippet.thumbnails?.default?.url ||
                      `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`
          };
        }
      }
    }
  } catch (error: any) {
    // API 실패 시 기본 썸네일 URL 사용 (이미 설정됨)
    if (error.name !== 'AbortError') {
      console.error('YouTube 썸네일 가져오기 실패 (기본 썸네일 사용):', error);
    }
  }

  return json({
    error,
    success,
    news,
    youtubeChannelUrl: 'https://www.youtube.com/@%EA%B8%B8%EC%9D%84%EC%97%AC%EB%8A%94%EA%B5%90%ED%9A%8C',
    latestVideo
  });
}

export default function Index() {
  const { error, success, news, youtubeChannelUrl, latestVideo } = useLoaderData<typeof loader>();
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

  // YouTube 최신 영상은 서버에서 이미 가져왔으므로 클라이언트에서는 불필요

  // 빠른 사용자 정보 로딩 (병렬 처리)
  useEffect(() => {
    if (!mounted) return;
    
    const loadUserData = async () => {
      console.log('🔄 홈탭 - 사용자 데이터 로딩 시작');
      setLoading(true);
      
      try {
        // 3초 타임아웃으로 단축
        const timeout = 3000;
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        );
        
        // 사용자 인증 정보 빠르게 확인
        const { data: { user }, error: authError } = await Promise.race([
          supabase.auth.getUser(),
          timeoutPromise
        ]) as any;
        
        if (authError) {
          console.warn('🔄 홈탭 - 인증 오류:', authError);
          setUser(null);
          setLoading(false);
          return;
        }
        
        console.log('👤 홈탭 - 사용자:', user?.email || 'null');
        setUser(user);
        
        if (!user) {
          setLoading(false);
          return;
        }
        
        // 사용자 정보와 최근 주문을 병렬로 로딩 (최적화)
        const [userDataResult, recentOrderResult] = await Promise.allSettled([
          supabase.from('users')
            .select('role, name, email')
            .eq('id', user.id)
            .single(),
          getOrdersByUserId(user.id, 1) // 홈탭에서는 최근 1개만 필요
        ]);
        
        // 사용자 데이터 처리
        if (userDataResult.status === 'fulfilled' && !userDataResult.value.error) {
          setUserData(userDataResult.value.data);
          console.log('📊 홈탭 - 사용자 데이터 로딩 완료');
        } else {
          console.warn('📊 홈탭 - 사용자 데이터 로딩 실패');
        }
        
        // 최근 주문 처리
        if (recentOrderResult.status === 'fulfilled' && recentOrderResult.value?.length > 0) {
          setRecentOrder(recentOrderResult.value[0]);
          console.log('📦 홈탭 - 최근 주문:', recentOrderResult.value.length, '개');
        } else {
          console.log('📦 홈탭 - 최근 주문 없음');
        }
        
      } catch (error) {
        console.error('❌ 홈탭 - 데이터 로딩 실패:', error);
        // 에러가 발생해도 사용자는 설정
        try {
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
        } catch {}
      } finally {
        setLoading(false);
        console.log('✅ 홈탭 - 로딩 완료');
      }
    };

    loadUserData();
  }, [mounted]);

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
                <div className="w-10 h-10 bg-ivory-200 border-2 border-ivory-300 rounded-xl animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-5 bg-ivory-200 rounded w-32 animate-pulse"></div>
                  <div className="h-3 bg-ivory-200 rounded w-12 animate-pulse"></div>
                </div>
              </div>
              <div className="h-8 bg-ivory-200 border-2 border-ivory-300 rounded w-16 animate-pulse"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {/* 스켈레톤 로딩 - 최근 주문 */}
            <div>
              <div className="bg-white border-2 border-wine-100 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="h-6 bg-ivory-200 rounded w-24 animate-pulse"></div>
                  <div className="h-4 bg-ivory-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-ivory-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-ivory-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-ivory-200 rounded w-2/3 animate-pulse"></div>
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
    <div className="min-h-screen bg-ivory-100 pb-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* 브랜드 및 사용자 정보 헤더 - 여백 최소화 */}
        <div className="mb-3 sm:mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-wine-600 rounded-xl flex items-center justify-center border-2 border-wine-700">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-wine-800 leading-tight">
                  길을여는교회 이음카페
                </h1>
                <div className="flex items-center gap-2">
                  <span className="bg-wine-600 text-white text-xs px-2 py-1 rounded-full font-bold border border-wine-700">
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
                    className="bg-ivory-100 hover:bg-ivory-200 text-wine-700 border border-wine-300 px-3 py-1 rounded-lg font-medium transition-all text-xs"
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
                  className="bg-wine-600 hover:bg-wine-700 text-white border-2 border-wine-700 px-4 py-2 rounded-lg font-bold transition-all text-sm"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* 교회소식 및 YouTube 영상 섹션 - 나란히 배치 */}
        <div className="mb-3 sm:mb-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* 교회소식 섹션 - 왼쪽 (2/3) */}
            <div className="lg:col-span-2 bg-ivory-50 border-2 border-wine-100 rounded-xl p-3 sm:p-4">
              <div className="text-center mb-4 sm:mb-5">
                <h2 className="text-xl sm:text-2xl font-black text-wine-800 mb-1 tracking-tight">
                  교회 소식
                </h2>
                <p className="text-wine-600 text-xs sm:text-sm font-medium">
                  하나님의 은혜가 함께하는 소식들
                </p>
              </div>
              
              {/* 2x2 그리드 패널 - 그림자 없이 깔끔한 border 기반, 여백 최소화 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-lg mx-auto">
              {/* 등록안내 패널 */}
              {news?.registerNotice && (
                <div className="bg-white border-2 border-wine-200 rounded-lg p-2.5 sm:p-3 hover:border-wine-400 transition-colors">
                  <div className="text-center mb-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-wine-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-wine-800 text-xs sm:text-sm">등록안내</h3>
                  </div>
                  <p className="text-wine-700 text-xs leading-tight whitespace-pre-line text-center">
                    {news?.registerNotice?.slice(0, 45)}...
                  </p>
                </div>
              )}
              
              {/* 행사일정 패널 */}
              {news?.events && news.events.length > 0 && (
                <div className="bg-white border-2 border-wine-200 rounded-lg p-2.5 sm:p-3 hover:border-wine-400 transition-colors">
                  <div className="text-center mb-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-wine-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-wine-800 text-xs sm:text-sm">행사일정</h3>
                  </div>
                  <div className="space-y-1.5">
                    {news?.events?.slice(0, 1).map((ev: any, idx: number) => (
                      <div key={idx} className="bg-ivory-100 border border-wine-200 rounded-lg p-1.5 text-center">
                        <h4 className="font-semibold text-wine-900 text-xs mb-0.5">{ev.title}</h4>
                        <p className="text-wine-700 text-xs">{ev.date}</p>
                      </div>
                    ))}
                    {news?.events && news.events.length > 1 && (
                      <div className="text-xs text-wine-600 font-medium text-center mt-1">
                        +{news?.events?.length - 1}개 더
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 생일축하 패널 */}
              {news?.birthdays && news.birthdays.length > 0 && (
                <div className="bg-white border-2 border-wine-200 rounded-lg p-2.5 sm:p-3 hover:border-wine-400 transition-colors">
                  <div className="text-center mb-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-wine-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-wine-800 text-xs sm:text-sm">생일축하</h3>
                  </div>
                  <div className="space-y-1">
                    {news?.birthdays?.slice(0, 2).map((b: any, idx: number) => (
                      <div key={idx} className="bg-ivory-100 border border-wine-200 rounded-lg p-1 text-center">
                        <p className="font-semibold text-wine-900 text-xs">{b.name}</p>
                        <p className="text-wine-700 text-xs">{b.date}</p>
                      </div>
                    ))}
                    {news?.birthdays && news.birthdays.length > 2 && (
                      <div className="text-xs text-wine-600 font-medium text-center mt-1">
                        +{news?.birthdays?.length - 2}명 더
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 헌금계좌 패널 */}
              {news?.offeringAccounts && news.offeringAccounts.length > 0 && (
                <div className="bg-white border-2 border-wine-200 rounded-lg p-2.5 sm:p-3 hover:border-wine-400 transition-colors">
                  <div className="text-center mb-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-wine-600 rounded-full flex items-center justify-center mx-auto mb-1.5">
                      <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-wine-800 text-xs sm:text-sm">헌금계좌</h3>
                  </div>
                  <div className="space-y-1">
                    {news?.offeringAccounts?.slice(0, 1).map((acc: any, idx: number) => (
                      <div key={idx} className="bg-ivory-100 border border-wine-200 rounded-lg p-1.5 text-center">
                        <p className="font-semibold text-wine-900 text-xs">{acc.bank}</p>
                        <p className="text-wine-700 text-xs font-mono">{acc.number}</p>
                      </div>
                    ))}
                    {news?.offeringAccounts && news.offeringAccounts.length > 1 && (
                      <div className="text-xs text-wine-600 font-medium text-center mt-1">
                        +{news?.offeringAccounts?.length - 1}개 더
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>

            {/* 설교 영상 섹션 - 오른쪽 (1/3), 크기 절반으로 조정 */}
            <div className="lg:col-span-1 bg-white border-2 border-wine-100 rounded-xl p-3 sm:p-4">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-wine-600 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <h2 className="text-base sm:text-lg font-bold text-wine-800">
                    설교영상
                  </h2>
                </div>
                <a
                  href={youtubeChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-wine-600 hover:text-wine-700 text-xs font-medium flex items-center gap-1"
                >
                  채널 →
                </a>
              </div>
              
              {/* YouTube 썸네일 및 제목 */}
              {latestVideo && (
                <a
                  href={`https://www.youtube.com/live/${latestVideo.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="relative w-full bg-ivory-100 border-2 border-wine-200 rounded-lg overflow-hidden mb-2" style={{ paddingBottom: '56.25%', minHeight: '150px' }}>
                    <img
                      src={latestVideo.thumbnail || `https://img.youtube.com/vi/${latestVideo.videoId}/hqdefault.jpg`}
                      alt={latestVideo.title}
                      className="absolute top-0 left-0 w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                      loading="eager"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        const videoId = latestVideo.videoId;
                        // 여러 썸네일 옵션 순차적으로 시도
                        if (img.src.includes('maxresdefault')) {
                          img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        } else if (img.src.includes('hqdefault')) {
                          img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                        } else if (img.src.includes('mqdefault')) {
                          img.src = `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
                        } else if (img.src.includes('sddefault')) {
                          img.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                        } else {
                          // 모든 옵션 실패 시 기본 배경색 유지
                          img.style.display = 'none';
                        }
                      }}
                    />
                    {/* 재생 버튼 오버레이 */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
                      <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xs sm:text-sm font-semibold text-wine-800 line-clamp-2 group-hover:text-wine-600 transition-colors mt-2">
                    {latestVideo.title}
                  </h3>
                </a>
              )}
              
              {/* 채널 링크 버튼 - 여백 최소화 */}
              <div className="mt-2 text-center">
                <a
                  href={youtubeChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-wine-600 hover:bg-wine-700 text-white border-2 border-wine-700 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs transition-colors"
                >
                  <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  구독하기
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 주문 섹션 - 여백 최소화 */}
        <div className="mb-3 sm:mb-4">
          <div className="bg-white border-2 border-wine-100 rounded-xl p-3 sm:p-4">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-wine-800">최근 주문</h2>
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
                  <div className="border-2 border-ivory-200 rounded-lg p-3 bg-ivory-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-wine-800 text-sm sm:text-base">
                          {recentOrder.church_group}
                        </h3>
                        <p className="text-xs sm:text-sm text-wine-600">
                          {new Date(recentOrder.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(recentOrder.status)}`}>
                        {getStatusLabel(recentOrder.status)}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 mb-2">
                      {recentOrder.order_items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between text-xs sm:text-sm text-wine-700">
                          <span>{item.menu?.name || '메뉴명 없음'}</span>
                          <span className="text-wine-600">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t-2 border-wine-200">
                      <span className="font-semibold text-wine-800 text-sm sm:text-base">
                        총 {recentOrder.total_amount.toLocaleString()}원
                      </span>
                      <Link
                        to="/recent"
                        className="text-wine-600 hover:text-wine-700 text-xs sm:text-sm font-medium"
                      >
                        자세히 보기
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <div className="text-wine-600 mb-3 sm:mb-4 text-sm">아직 주문 내역이 없습니다.</div>
                    <Link
                      to="/orders/new"
                      className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-wine-600 text-wine-600 bg-white hover:bg-wine-50 text-xs sm:text-sm font-medium rounded-lg transition-colors"
                    >
                      첫 주문하기
                    </Link>
                  </div>
                )
              ) : (
                // 비로그인 사용자 - 로그인 유도, 여백 최소화
                <div className="text-center py-6 sm:py-8">
                  <div className="mb-4 sm:mb-5">
                    <svg className="mx-auto h-12 w-12 sm:h-14 sm:w-14 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" />
                    </svg>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-wine-800 mb-1.5 sm:mb-2">
                    주문 내역을 확인하려면 로그인이 필요합니다
                  </h3>
                  <p className="text-wine-600 mb-4 sm:mb-5 text-xs sm:text-sm">
                    이메일과 비밀번호로 로그인하고<br />주문 내역을 확인해보세요.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                    <button
                      onClick={() => setShowLogin(true)}
                      className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-wine-600 text-sm sm:text-base font-medium rounded-lg text-white bg-wine-600 hover:bg-wine-700 transition-colors"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      로그인
                    </button>
                    <button
                      onClick={() => setShowSignup(true)}
                      className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 border-2 border-wine-600 text-wine-600 bg-white rounded-lg font-medium hover:bg-ivory-50 transition-colors text-sm sm:text-base"
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
            className="fixed inset-0 bg-wine-900/40 z-[50000]"
            onClick={() => setShowLogin(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-wine-200 rounded-xl p-6 w-full max-w-xs sm:max-w-md"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-wine-400 hover:text-wine-700 text-xl font-bold z-10"
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
            className="fixed inset-0 bg-wine-900/40 z-[50000]"
            onClick={() => setShowSignup(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-wine-200 rounded-xl p-6 w-full max-w-xs sm:max-w-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-wine-400 hover:text-wine-700 text-xl font-bold z-10"
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
      
      {/* 로그인 성공 메시지 - 그림자 없이 깔끔한 디자인 */}
      {loginSuccess && (
        <div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[99999] bg-ivory-100 border-2 border-wine-300 text-wine-700 px-4 sm:px-6 py-3 sm:py-4 rounded-lg animate-fade-in font-bold text-sm sm:text-lg">
          로그인 되었습니다
        </div>
      )}
    </div>
  );
}
