import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getMenus, getOrders, getSalesStatistics, getOrdersByUserId, getTodayOrdersByStatus, getWeeklySalesForLast4Weeks, getTodayOrderStatusStats, getDailySales } from "~/lib/database";
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
    // 로그인 사용자 정보 가져오기
    const cookie = request.headers.get('cookie');
    let userId: string | undefined = undefined;
    if (cookie) {
      // supabase 세션에서 user id 추출
      const match = cookie.match(/sb-user-id=([^;]+)/);
      if (match) userId = decodeURIComponent(match[1]);
    }

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

    // 오늘의 현재 주문 상태 통계 조회
    const todayStatusStats = await getTodayOrderStatusStats();

    // 최근 4주간 주간매출 조회
    const weeklySales = await getWeeklySalesForLast4Weeks();

    // 일별 매출 조회
    const dailySales = await getDailySales();

    // 로그인한 사용자 주문만 recentOrders로
    let recentOrders: any[] = [];
    if (userId) {
      recentOrders = await getOrdersByUserId(userId, 5);
    }

    // 오늘의 대기중 주문과 제조완료 주문 가져오기
    const [todayPendingOrders, todayReadyOrders] = await Promise.all([
      getTodayOrdersByStatus('pending'),
      getTodayOrdersByStatus('ready')
    ]);

    return json({
      menuStats,
      orderStats,
      recentOrders,
      totalMenus: menus.length,
      totalOrders: orders.length,
      menus: menus.slice(0, 8),
      error,
      success,
      salesStats,
      todayStatusStats,
      weeklySales,
      dailySales,
      todayPendingOrders,
      todayReadyOrders,
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
      todayStatusStats: {
        pending: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        cancelled: 0,
        confirmedOrders: 0
      },
      weeklySales: [],
      dailySales: [],
      todayPendingOrders: [],
      todayReadyOrders: [],
    });
  }
}

export default function Index() {
  const { menuStats, orderStats, recentOrders, totalMenus, totalOrders, menus, error, success, salesStats, todayStatusStats, weeklySales, dailySales, todayPendingOrders, todayReadyOrders } = useLoaderData<typeof loader>();
  
  // 로그인 상태 및 권한 확인
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [pendingOrders, setPendingOrders] = useState(todayPendingOrders);
  const [readyOrders, setReadyOrders] = useState(todayReadyOrders);
  const [statusStats, setStatusStats] = useState(todayStatusStats);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredDailySales, setFilteredDailySales] = useState(dailySales);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        setUserRole(userData?.role || null);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setUserRole(data?.role || null));
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // 실시간 구독
    const channel = supabase
      .channel('orders-realtime-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        // 오늘 날짜 계산
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 오늘 주문 데이터 새로고침
        const [pending, ready] = await Promise.all([
          supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('status', 'pending')
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString()),
          supabase
            .from('orders')
            .select('*, order_items(*)')
            .eq('status', 'ready')
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString()),
        ]);
        setPendingOrders(pending.data || []);
        setReadyOrders(ready.data || []);

        // 오늘 상태별 통계 새로고침
        const { data: todayOrders } = await supabase
          .from('orders')
          .select('status, payment_status')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());
        
        const stats = { pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0, confirmedOrders: 0 };
        todayOrders?.forEach((order: any) => {
          if (!order) return;
          const status = String(order.status) as keyof typeof stats;
          if (status in stats) stats[status] = (stats[status] || 0) + 1;
          if(order.payment_status === 'confirmed') stats.confirmedOrders += 1;
        });
        setStatusStats(stats);

        // 일별 매출 데이터 새로고침
        const updatedDailySales = await getDailySales(startDate || undefined, endDate || undefined);
        setFilteredDailySales(updatedDailySales);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [startDate, endDate]);

  // 타입 안전성을 위한 문자열 변환
  const errorMessage = error ? String(error) : null;
  const successMessage = success ? String(success) : null;

  // 기간 필터링 함수
  const handleFilterSales = async () => {
    const filteredSales = await getDailySales(startDate || undefined, endDate || undefined);
    setFilteredDailySales(filteredSales);
    setCurrentPage(1); // 페이지를 첫 페이지로 리셋
  };

  // 필터 초기화 함수
  const handleResetFilter = async () => {
    setStartDate('');
    setEndDate('');
    const allSales = await getDailySales();
    setFilteredDailySales(allSales);
    setCurrentPage(1);
  };

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
        {/* 현황 패널 */}
        <div className="relative bg-ivory-100 border-4 border-wine-600 rounded-3xl p-4 sm:p-6 mb-8">
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-wine-800">카페 주문현황</h2>
            <span className="mt-1 text-xs sm:text-sm text-wine-500 font-semibold">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-4 gap-2 sm:gap-6 min-w-[340px] sm:min-w-0">
              {/* 대기중 */}
              <div className="bg-ivory-50 rounded-xl shadow-soft p-2 sm:p-4 text-center border border-wine-200 min-w-0">
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 sm:w-8 sm:h-8 text-wine-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl sm:text-2xl font-black text-wine-700 mb-1">{statusStats.pending}</h3>
                  <p className="text-xs sm:text-sm text-wine-600 font-bold">대기중</p>
                </div>
              </div>
              {/* 제조중 */}
              <div className="bg-ivory-50 rounded-xl shadow-soft p-2 sm:p-4 text-center border border-wine-200 min-w-0">
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 sm:w-8 sm:h-8 text-wine-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <h3 className="text-xl sm:text-2xl font-black text-wine-700 mb-1">{statusStats.preparing}</h3>
                  <p className="text-xs sm:text-sm text-wine-600 font-bold">제조중</p>
                </div>
              </div>
              {/* 제조완료 */}
              <div className="bg-ivory-50 rounded-xl shadow-soft p-2 sm:p-4 text-center border border-wine-200 min-w-0">
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 sm:w-8 sm:h-8 text-wine-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl sm:text-2xl font-black text-wine-700 mb-1">{statusStats.ready}</h3>
                  <p className="text-xs sm:text-sm text-wine-600 font-bold">제조완료</p>
                </div>
              </div>
              {/* 결제완료 */}
              <div className="bg-ivory-50 rounded-xl shadow-soft p-2 sm:p-4 text-center border border-wine-200 min-w-0">
                <div className="flex flex-col items-center">
                  <svg className="w-5 h-5 sm:w-8 sm:h-8 text-wine-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={2} fill="none" />
                  </svg>
                  <h3 className="text-xl sm:text-2xl font-black text-wine-700 mb-1">{statusStats.confirmedOrders}</h3>
                  <p className="text-xs sm:text-sm text-wine-600 font-bold">결제완료</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 하단 2행 2열: 대기중/제조완료 주문 */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            {/* 대기중 주문 */}
            <div className="bg-ivory-50 rounded-xl border border-wine-200 p-3 sm:p-4">
              <h4 className="text-base sm:text-lg font-bold text-wine-700 mb-2">오늘 대기중 주문</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-center border-separate border-spacing-y-1">
                  <thead>
                    <tr className="bg-ivory-100 text-wine-700 text-xs">
                      <th className="px-1 py-1">연번</th>
                      <th className="px-1 py-1">주문목장</th>
                      <th className="px-1 py-1">주문잔수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingOrders && pendingOrders.length > 0 ? (
                      pendingOrders.map((order, idx) => order ? (
                        <tr key={order.id} className="bg-ivory-50 text-xs">
                          <td className="font-bold text-wine-700 px-1 py-1">{idx + 1}</td>
                          <td className="text-wine-800 px-1 py-1">{order.church_group || '-'}</td>
                          <td className="text-wine-700 px-1 py-1">{order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0}잔</td>
                        </tr>
                      ) : null)
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-wine-400 text-xs py-2">대기중 주문 없음</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* 제조완료(ready) 주문 */}
            <div className="bg-ivory-50 rounded-xl border border-wine-200 p-3 sm:p-4">
              <h4 className="text-base sm:text-lg font-bold text-wine-700 mb-2">오늘 제조완료 주문</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-center border-separate border-spacing-y-1">
                  <thead>
                    <tr className="bg-ivory-100 text-wine-700 text-xs">
                      <th className="px-1 py-1">연번</th>
                      <th className="px-1 py-1">주문목장</th>
                      <th className="px-1 py-1">주문잔수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readyOrders && readyOrders.length > 0 ? (
                      readyOrders.map((order, idx) => order ? (
                        <tr key={order.id} className="bg-ivory-50 text-xs">
                          <td className="font-bold text-wine-700 px-1 py-1">{idx + 1}</td>
                          <td className="text-wine-800 px-1 py-1">{order.church_group || '-'}</td>
                          <td className="text-wine-700 px-1 py-1">{order.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0}잔</td>
                        </tr>
                      ) : null)
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-wine-400 text-xs py-2">제조완료 주문 없음</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* 매출 정보 */}
        {user && userRole === 'admin' && (
          <div className="mb-8">
            {/* 최근 매출 */}
            <div className="bg-gradient-ivory rounded-xl shadow-soft p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-black text-wine-800 text-center sm:text-left">역대 매출</h3>
                
                {/* 기간 필터 */}
                <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-3 py-2 border border-wine-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
                      placeholder="시작일"
                    />
                    <span className="text-wine-600 font-bold">~</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-3 py-2 border border-wine-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-wine-500"
                      placeholder="종료일"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFilterSales}
                      className="px-4 py-2 bg-gradient-wine text-white rounded-lg font-bold text-sm hover:shadow-wine transition-all duration-300"
                    >
                      필터
                    </button>
                    <button
                      onClick={handleResetFilter}
                      className="px-4 py-2 bg-wine-100 text-wine-700 rounded-lg font-bold text-sm hover:bg-wine-200 transition-all duration-300"
                    >
                      초기화
                    </button>
                  </div>
                </div>
              </div>
              
              {filteredDailySales && filteredDailySales.length > 0 ? (
                <>
                  {/* 테이블 */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-center border-separate border-spacing-y-2">
                      <thead>
                        <tr className="bg-ivory-100 text-wine-700 text-sm sm:text-base">
                          <th className="px-4 py-3">연번</th>
                          <th className="px-4 py-3">일자</th>
                          <th className="px-4 py-3">주문완료 금액</th>
                          <th className="px-4 py-3">결제완료 금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDailySales
                          .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                          .map((day, idx) => (
                          <tr key={day.date} className="bg-white border border-wine-200">
                            <td className="px-4 py-3 font-bold text-wine-700">
                              {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                            </td>
                            <td className="px-4 py-3 text-wine-800">
                              {new Date(day.date).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                weekday: 'long'
                              })}
                            </td>
                            <td className="px-4 py-3 font-bold text-wine-800">
                              ₩{day.orderCompletedRevenue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 font-bold text-wine-800">
                              ₩{day.paymentConfirmedRevenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 페이지네이션 */}
                  {filteredDailySales.length > ITEMS_PER_PAGE && (
                    <div className="flex justify-center items-center gap-2 mt-6">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 bg-wine-100 text-wine-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-wine-200 transition-all duration-300"
                      >
                        이전
                      </button>
                      
                      <span className="px-4 py-2 text-wine-700 font-bold">
                        {currentPage} / {Math.ceil(filteredDailySales.length / ITEMS_PER_PAGE)}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredDailySales.length / ITEMS_PER_PAGE), prev + 1))}
                        disabled={currentPage === Math.ceil(filteredDailySales.length / ITEMS_PER_PAGE)}
                        className="px-3 py-2 bg-wine-100 text-wine-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-wine-200 transition-all duration-300"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-wine-600 py-8">
                  매출 데이터가 없습니다.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 최근 주문 */}
        {user && (
          <div className="bg-white rounded-xl shadow-soft p-4 sm:p-6 mb-8">
            <div className="mb-4">
              <h3 className="text-xl sm:text-2xl font-black text-wine-800">최근 주문</h3>
            </div>
            {recentOrders.length > 0 ? (
              <>
                {/* 모바일: 카드형 */}
                <div className="block sm:hidden space-y-3">
                  {recentOrders.slice(0, 5).map((order: any, idx: number) => order && (
                    <div key={order.id} className="bg-ivory-50 rounded-xl border border-wine-100 p-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-wine-400">#{idx + 1}</span>
                        <span className="font-bold text-wine-800">₩{order.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="font-bold text-wine-800 text-sm">{order.customer_name}</div>
                      <div className="text-xs text-wine-600">{order.church_group || '-'}</div>
                      <div className="flex flex-wrap gap-1 text-xs text-wine-700">
                        {order.order_items?.map((item: any) => (
                          <span key={item.id}>{item.menu?.name} x{item.quantity}</span>
                        ))}
                      </div>
                      <div className="flex flex-row flex-wrap gap-1 mt-1">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          order.status === 'completed' ? 'bg-wine-100 text-wine-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'pending' ? '대기' :
                           order.status === 'preparing' ? '제조중' :
                           order.status === 'ready' ? '제조완료' :
                           order.status === 'completed' ? '주문완료' :
                           order.status === 'cancelled' ? '취소' : order.status}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          order.payment_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.payment_status === 'confirmed' ? '결제완료' : '결제대기'}
                        </span>
                      </div>
                      <button
                        className="mt-2 px-3 py-2 bg-gradient-wine text-ivory-50 rounded-lg text-xs font-bold hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
                        onClick={() => {
                          const reorderData = {
                            customerName: order.customer_name,
                            churchGroup: order.church_group,
                            paymentMethod: order.payment_method,
                            notes: order.notes,
                            items: order.order_items?.map(item => ({
                              menu_id: item.menu?.id,
                              quantity: item.quantity,
                              unit_price: item.menu?.price,
                              total_price: item.total_price,
                            }))
                          };
                          localStorage.setItem('reorder', JSON.stringify(reorderData));
                          window.location.href = '/orders/new';
                        }}
                      >
                        같은메뉴 재주문
                      </button>
                    </div>
                  ))}
                </div>
                {/* 데스크탑: 테이블 */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="min-w-full text-center border-separate border-spacing-y-2">
                    <thead>
                      <tr className="bg-ivory-100 text-wine-700 text-sm sm:text-base">
                        <th className="px-2 py-2">연번</th>
                        <th className="px-2 py-2">주문인</th>
                        <th className="px-2 py-2">주문메뉴</th>
                        <th className="px-2 py-2">총액</th>
                        <th className="px-2 py-2">재주문</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.slice(0, 5).map((order: any, idx: number) => (
                        order ? (
                          <tr key={order.id} className="bg-ivory-50">
                            {/* 연번 */}
                            <td className="font-bold text-wine-700 align-middle">{idx + 1}</td>
                            {/* 주문인 */}
                            <td className="align-middle">
                              <div className="font-bold text-wine-800">{order.customer_name}</div>
                              <div className="text-xs text-wine-600">{order.church_group || '-'}</div>
                            </td>
                            {/* 주문메뉴 */}
                            <td className="align-middle">
                              <div className="flex flex-col gap-1 items-center">
                                {order.order_items?.map((item: any) => (
                                  <div key={item.id} className="text-xs sm:text-sm text-wine-700">
                                    {item.menu?.name} x {item.quantity}
                                  </div>
                                ))}
                              </div>
                            </td>
                            {/* 총액(상태/결제 뱃지) */}
                            <td className="align-middle">
                              <div className="font-bold text-wine-800">₩{order.total_amount.toLocaleString()}</div>
                              <div className="flex flex-row flex-wrap gap-1 justify-center mt-1">
                                {/* 주문 상태 뱃지 */}
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'ready' ? 'bg-green-100 text-green-800' :
                                  order.status === 'completed' ? 'bg-wine-100 text-wine-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {order.status === 'pending' ? '대기' :
                                   order.status === 'preparing' ? '제조중' :
                                   order.status === 'ready' ? '제조완료' :
                                   order.status === 'completed' ? '주문완료' :
                                   order.status === 'cancelled' ? '취소' : order.status}
                                </span>
                                {/* 결제 상태 뱃지 */}
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  order.payment_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {order.payment_status === 'confirmed' ? '결제완료' : '결제대기'}
                                </span>
                              </div>
                            </td>
                            {/* 재주문 버튼 */}
                            <td className="align-middle">
                              <button
                                className="px-3 py-2 bg-gradient-wine text-ivory-50 rounded-lg text-xs sm:text-sm font-bold hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
                                onClick={() => {
                                  const reorderData = {
                                    customerName: order.customer_name,
                                    churchGroup: order.church_group,
                                    paymentMethod: order.payment_method,
                                    notes: order.notes,
                                    items: order.order_items?.map(item => ({
                                      menu_id: item.menu?.id,
                                      quantity: item.quantity,
                                      unit_price: item.menu?.price,
                                      total_price: item.total_price,
                                    }))
                                  };
                                  localStorage.setItem('reorder', JSON.stringify(reorderData));
                                  window.location.href = '/orders/new';
                                }}
                              >
                                같은메뉴 재주문
                              </button>
                            </td>
                          </tr>
                        ) : null
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-wine-400">주문 내역이 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 빠른 액션 - 관리자만 매출 보고서 */}
        {user && userRole === 'admin' && (
          <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-4 sm:gap-6">
            <Link
              to="/reports"
              className="bg-gradient-wine text-ivory-50 rounded-xl p-4 sm:p-6 text-center hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 sm:w-12 sm:h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="font-bold text-sm sm:text-base">매출 보고서</h3>
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
