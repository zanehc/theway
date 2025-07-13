import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getOrdersByUserId } from "~/lib/database";
import { supabase } from "~/lib/supabase";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  return json({
    error,
    success
  });
}

export default function Index() {
  const { error, success } = useLoaderData<typeof loader>();
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
      {/* 환영 메시지 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-3xl font-bold text-wine-800">
              {userData?.name || '사용자'}님 안녕하세요! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              오늘도 맛있는 음료와 함께하세요.
            </p>
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
                <div className="border-l-4 border-wine-600 pl-4">
                  <h3 className="font-semibold text-gray-900 text-sm">이번 주 예배 안내</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    주일 예배: 오전 11시<br />
                    수요 예배: 오후 7시
                  </p>
                </div>
                
                <div className="border-l-4 border-blue-600 pl-4">
                  <h3 className="font-semibold text-gray-900 text-sm">목장 모임</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    매주 토요일 오후 2시<br />
                    각 목장별로 진행
                  </p>
                </div>
                
                <div className="border-l-4 border-green-600 pl-4">
                  <h3 className="font-semibold text-gray-900 text-sm">청년부 모임</h3>
                  <p className="text-gray-600 text-sm mt-1">
                    매주 금요일 오후 7시<br />
                    청년부실에서 진행
                  </p>
                </div>
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
