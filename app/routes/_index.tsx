import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getMenus, getOrders, getSalesStatistics } from "~/lib/database";
import Header from "~/components/Header";
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';

// Leaflet 타입 선언
declare global {
  interface Window {
    L: any;
    mapInitialized?: boolean;
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  try {
    const [menus, orders] = await Promise.all([
      getMenus(),
      getOrders()
    ]);

    // 카테고리별 메뉴 수 계산
    const menuStats = menus.reduce((acc, menu) => {
      acc[menu.category] = (acc[menu.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 주문 상태별 개수 계산
    const orderStats = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 오늘의 매출 통계 조회
    const salesStats = await getSalesStatistics('today');

    return json({
      menuStats,
      orderStats,
      recentOrders: orders.slice(0, 5), // 최근 5개 주문
      totalMenus: menus.length,
      totalOrders: orders.length,
      menus: menus.slice(0, 8), // 홈페이지에 표시할 메뉴 8개
      error,
      success,
      salesStats,
    });
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return json({
      menuStats: {},
      orderStats: {},
      recentOrders: [],
      totalMenus: 0,
      totalOrders: 0,
      menus: [],
      error,
      success,
      salesStats: {
        totalRevenue: 0,
        totalOrders: 0,
        confirmedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        menuStats: [],
        statusStats: {
          pending: 0,
          preparing: 0,
          ready: 0,
          completed: 0,
          cancelled: 0,
        }
      },
    });
  }
}

export default function Index() {
  const { menuStats, orderStats, recentOrders, totalMenus, totalOrders, menus, error, success, salesStats } = useLoaderData<typeof loader>();
  
  // 로그인 상태 확인
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 타입 안전성을 위한 문자열 변환
  const errorMessage = error ? String(error) : null;
  const successMessage = success ? String(success) : null;

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      {/* OAuth 결과 메시지 */}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {errorMessage}
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}
      
      {/* 대시보드 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-wine-800 mb-4 tracking-tight">
            길을여는교회 이음카페
          </h1>
          <p className="text-lg sm:text-xl text-wine-600 font-medium">
            {new Date().toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </p>
        </div>

        {/* 통계 카드들 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {/* 총 주문 */}
          <Link to="/orders" className="bg-white rounded-xl shadow-soft p-4 sm:p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-medium animate-slide-up cursor-pointer">
            <div className="p-3 bg-gradient-wine rounded-lg shadow-wine inline-block mb-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-wine-800 mb-1">{salesStats.totalOrders}</h3>
            <p className="text-sm sm:text-base text-wine-600 font-medium">총 주문</p>
          </Link>

          {/* 대기중 */}
          <Link to="/orders?status=pending" className="bg-white rounded-xl shadow-soft p-4 sm:p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-medium animate-slide-up cursor-pointer" style={{animationDelay: '0.1s'}}>
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg shadow-medium inline-block mb-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-wine-800 mb-1">{salesStats.statusStats.pending}</h3>
            <p className="text-sm sm:text-base text-wine-600 font-medium">대기중</p>
          </Link>

          {/* 제조중 */}
          <Link to="/orders?status=preparing" className="bg-white rounded-xl shadow-soft p-4 sm:p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-medium animate-slide-up cursor-pointer" style={{animationDelay: '0.2s'}}>
            <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-medium inline-block mb-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-wine-800 mb-1">{salesStats.statusStats.preparing}</h3>
            <p className="text-sm sm:text-base text-wine-600 font-medium">제조중</p>
          </Link>

          {/* 완료 */}
          <Link to="/orders?status=completed" className="bg-white rounded-xl shadow-soft p-4 sm:p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-medium animate-slide-up cursor-pointer" style={{animationDelay: '0.3s'}}>
            <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-medium inline-block mb-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-wine-800 mb-1">{salesStats.statusStats.completed}</h3>
            <p className="text-sm sm:text-base text-wine-600 font-medium">완료</p>
          </Link>
        </div>

        {/* 매출 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* 총 매출 */}
          <Link to="/reports" className="bg-gradient-ivory rounded-xl shadow-soft p-4 sm:p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-medium cursor-pointer">
            <h3 className="text-lg sm:text-xl font-black text-wine-800 mb-2">오늘의 매출</h3>
            <p className="text-2xl sm:text-3xl font-black text-wine-600">₩{salesStats.totalRevenue.toLocaleString()}</p>
          </Link>

          {/* 결제 완료 */}
          <Link to="/orders?payment_status=confirmed" className="bg-gradient-ivory rounded-xl shadow-soft p-4 sm:p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-medium cursor-pointer">
            <h3 className="text-lg sm:text-xl font-black text-wine-800 mb-2">결제 완료</h3>
            <p className="text-2xl sm:text-3xl font-black text-wine-600">{salesStats.confirmedOrders}건</p>
          </Link>

          {/* 운영시간 */}
          <div className="bg-gradient-ivory rounded-xl shadow-soft p-4 sm:p-6 text-center">
            <h3 className="text-lg sm:text-xl font-black text-wine-800 mb-2">운영시간</h3>
            <p className="text-lg sm:text-xl font-bold text-wine-600">일요일 13:00-14:00</p>
          </div>
        </div>

        {/* 최근 주문 */}
        {user && (
          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl sm:text-2xl font-black text-wine-800">최근 주문</h3>
              <Link 
                to="/orders" 
                className="px-4 py-2 bg-gradient-wine text-ivory-50 rounded-lg text-sm font-bold hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
              >
                전체보기
              </Link>
            </div>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 5).map((order) => order && (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-ivory-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-wine-800">{order.customer_name}</p>
                      <p className="text-sm text-wine-600">{order.church_group}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-wine-800">₩{order.total_amount.toLocaleString()}</p>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'ready' ? 'bg-green-100 text-green-800' :
                        order.status === 'completed' ? 'bg-wine-100 text-wine-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'pending' ? '대기' :
                         order.status === 'preparing' ? '제조중' :
                         order.status === 'ready' ? '완료' :
                         order.status === 'completed' ? '픽업완료' :
                         order.status === 'cancelled' ? '취소' : order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-wine-400 py-8">주문 내역이 없습니다.</p>
            )}
          </div>
        )}

        {/* 로그인 안내 */}
        {!user && (
          <div className="bg-gradient-ivory rounded-xl shadow-soft p-6 sm:p-8 text-center">
            <h3 className="text-xl sm:text-2xl font-black text-wine-800 mb-4">주문을 하시려면 로그인이 필요합니다</h3>
            <p className="text-lg text-wine-600 mb-6">로그인 후 주문 현황과 새 주문을 이용하실 수 있습니다.</p>
            <button
              onClick={() => {
                const header = document.querySelector('[data-login-button]') as HTMLElement;
                if (header) header.click();
              }}
              className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-wine text-ivory-50 rounded-xl text-lg sm:text-xl font-bold hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
            >
              로그인하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
