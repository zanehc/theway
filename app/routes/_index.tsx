import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getOrdersByUserId } from "~/lib/database";
import { supabase } from "~/lib/supabase";

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
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [recentOrder, setRecentOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // 사용자 정보와 최근 주문 불러오기
  useEffect(() => {
    if (!mounted) return;
    
    const getUserAndRecentOrder = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          // 사용자 정보 가져오기
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, name, email')
            .eq('id', user.id)
            .single();
          
          if (!userError && userData) {
            setUserData(userData);
            
            // 최근 주문 1건 가져오기
            const userOrders = await getOrdersByUserId(user.id);
            if (userOrders && userOrders.length > 0) {
              setRecentOrder(userOrders[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user and recent order:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserAndRecentOrder();
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-wine-800 mb-6 text-center">웰컴</h1>
          <p className="text-gray-600 mb-6 text-center">
            로그인하여 주문 서비스를 이용해보세요.
          </p>
          <div className="space-y-3">
            <Link
              to="/other"
              className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors block text-center"
            >
              로그인
            </Link>
            <Link
              to="/other"
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-bold hover:bg-gray-200 transition-colors block text-center"
            >
              회원가입
            </Link>
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
      {/* 상단 헤더 영역 개선 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-4">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-wine-800 leading-tight">길을여는교회</div>
            <div className="flex items-center mt-1">
              <span className="text-base sm:text-lg font-bold text-wine-600">이음카페</span>
              <span className="inline-block bg-yellow-400 text-xs font-bold text-white px-2 py-1 rounded-full ml-2 align-middle">Beta</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold text-wine-700">{userData?.name || 'ㅇㅇㅇ'}님 안녕하세요!</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 최근 주문 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">최근 주문</h2>
                <Link
                  to="/recent"
                  className="text-wine-600 hover:text-wine-700 text-sm font-medium"
                >
                  전체보기 →
                </Link>
              </div>
              
              {recentOrder ? (
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
                        <span>{item.menu_name}</span>
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
              )}
            </div>
          </div>

          {/* 교회 소식 배너 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">교회 소식</h2>
              
              <div className="space-y-4">
                {/* 등록안내 */}
                {news.registerNotice && (
                  <div className="border-l-4 border-wine-600 pl-4">
                    <h3 className="font-semibold text-gray-900 text-sm">등록안내</h3>
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">
                      {news.registerNotice}
                    </p>
                  </div>
                )}
                
                {/* 행사/캠프 일정 */}
                {news.events && news.events.length > 0 && (
                  <div className="border-l-4 border-blue-600 pl-4">
                    <h3 className="font-semibold text-gray-900 text-sm">행사/캠프 일정</h3>
                    <div className="mt-1 space-y-1">
                      {news.events.slice(0, 2).map((ev: any, idx: number) => (
                        <div key={idx} className="text-gray-600 text-sm">
                          <span className="font-medium">{ev.title}</span>
                          <br />
                          <span className="text-xs text-gray-500">{ev.date} - {ev.desc}</span>
                        </div>
                      ))}
                      {news.events.length > 2 && (
                        <div className="text-xs text-gray-500">
                          외 {news.events.length - 2}건 더...
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 생일자 */}
                {news.birthdays && news.birthdays.length > 0 && (
                  <div className="border-l-4 border-green-600 pl-4">
                    <h3 className="font-semibold text-gray-900 text-sm">생일자</h3>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {news.birthdays.slice(0, 6).map((b: any, idx: number) => (
                        <div key={idx} className="text-gray-600 text-sm">
                          <span className="font-medium">{b.name}</span>
                          <span className="text-xs text-gray-500 ml-2">{b.date}</span>
                        </div>
                      ))}
                      {news.birthdays.length > 6 && (
                        <div className="col-span-3 text-xs text-gray-500">
                          외 {news.birthdays.length - 6}명 더...
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 헌금계좌 */}
                {news.offeringAccounts && news.offeringAccounts.length > 0 && (
                  <div className="border-l-4 border-purple-600 pl-4">
                    <h3 className="font-semibold text-gray-900 text-sm">헌금계좌</h3>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {news.offeringAccounts.slice(0, 6).map((acc: any, idx: number) => (
                        <div key={idx} className="text-gray-600 text-sm">
                          <span className="font-medium">{acc.bank}</span><br />
                          <span className="text-xs text-gray-500">{acc.number}</span>
                        </div>
                      ))}
                      {news.offeringAccounts.length > 6 && (
                        <div className="col-span-3 text-xs text-gray-500">
                          외 {news.offeringAccounts.length - 6}개 더...
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* 기타 공지 */}
                {news.etc && (
                  <div className="border-l-4 border-orange-600 pl-4">
                    <h3 className="font-semibold text-gray-900 text-sm">기타 공지</h3>
                    <p className="text-gray-600 text-sm mt-1 whitespace-pre-line">
                      {news.etc}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  더 많은 소식 보기
                </button>
              </div>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
}
