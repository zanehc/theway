import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { supabase } from "~/lib/supabase";
import Header from "~/components/Header";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'today';

    // 기간별 날짜 계산
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default: // today
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
    }

    // 주문 데이터 조회
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu:menus (*)
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // 메뉴별 판매 통계
    const menuStats = new Map();
    let totalRevenue = 0;
    let totalOrders = orders?.length || 0;

    orders?.forEach((order: any) => {
      if (order.payment_status === 'confirmed') {
        totalRevenue += order.total_amount;
      }

      order.order_items?.forEach((item: any) => {
        const menuName = item.menu?.name || 'Unknown';
        const existing = menuStats.get(menuName) || { quantity: 0, revenue: 0 };
        menuStats.set(menuName, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.total_price,
        });
      });
    });

    // 목장별 통계
    const groupStats = new Map();
    orders?.forEach((order: any) => {
      if (order.church_group) {
        const existing = groupStats.get(order.church_group) || { orders: 0, revenue: 0 };
        groupStats.set(order.church_group, {
          orders: existing.orders + 1,
          revenue: existing.revenue + (order.payment_status === 'confirmed' ? order.total_amount : 0),
        });
      }
    });

    // 시간대별 주문 통계
    const hourlyStats = new Array(24).fill(0);
    orders?.forEach((order: any) => {
      const hour = new Date(order.created_at).getHours();
      hourlyStats[hour]++;
    });

    return json({
      period,
      totalRevenue,
      totalOrders,
      menuStats: Array.from(menuStats.entries()).map(([name, stats]) => ({
        name,
        ...stats,
      })).sort((a, b) => b.quantity - a.quantity),
      groupStats: Array.from(groupStats.entries()).map(([name, stats]) => ({
        name,
        ...stats,
      })).sort((a, b) => b.revenue - a.revenue),
      hourlyStats,
      orders: orders || [],
    });
  } catch (error) {
    console.error('Reports loader error:', error);
    return json({
      period: 'today',
      totalRevenue: 0,
      totalOrders: 0,
      menuStats: [],
      groupStats: [],
      hourlyStats: new Array(24).fill(0),
      orders: [],
    });
  }
}

export default function Reports() {
  const { period, totalRevenue, totalOrders, menuStats, groupStats, hourlyStats, orders } = useLoaderData<typeof loader>();
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  const getPeriodLabel = (p: string) => {
    switch (p) {
      case 'today': return '오늘';
      case 'week': return '이번 주';
      case 'month': return '이번 달';
      default: return '오늘';
    }
  };

  const getPeriodDateRange = (p: string) => {
    const now = new Date();
    switch (p) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return `${weekAgo.toLocaleDateString('ko-KR')} ~ ${now.toLocaleDateString('ko-KR')}`;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return `${monthStart.toLocaleDateString('ko-KR')} ~ ${now.toLocaleDateString('ko-KR')}`;
      default:
        return now.toLocaleDateString('ko-KR');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="mb-12 animate-fade-in">
          <h1 className="text-5xl font-black text-wine-800 mb-4 tracking-tight">매출 보고</h1>
          <p className="text-2xl text-wine-600 font-medium">매출 현황과 통계를 확인하세요</p>
        </div>

        {/* 기간 선택 */}
        <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 mb-12 border border-ivory-200/50 animate-slide-up">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-xl font-bold text-wine-700">기간 선택:</span>
            {['today', 'week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => {
                  setSelectedPeriod(p);
                  window.location.href = `/reports?period=${p}`;
                }}
                className={`px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 shadow-soft hover:shadow-medium transform hover:-translate-y-1 ${
                  selectedPeriod === p 
                    ? 'bg-gradient-wine text-ivory-50 shadow-wine' 
                    : 'bg-ivory-200/80 text-wine-700 hover:bg-wine-100'
                }`}
              >
                {getPeriodLabel(p)}
              </button>
            ))}
            <span className="text-lg text-wine-500 font-medium ml-6">
              {getPeriodDateRange(selectedPeriod)}
            </span>
          </div>
        </div>

        {/* 주요 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 border border-ivory-200/50 flex items-center transition-all duration-300 hover:-translate-y-2 hover:shadow-large animate-slide-up">
            <div className="p-4 bg-gradient-wine rounded-2xl shadow-wine">
              <svg className="w-10 h-10 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-6">
              <p className="text-lg font-bold text-wine-500 mb-2">총 매출</p>
              <p className="text-4xl font-black text-wine-800">₩{totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 border border-ivory-200/50 flex items-center transition-all duration-300 hover:-translate-y-2 hover:shadow-large animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="p-4 bg-gradient-to-br from-wine-300 to-wine-500 rounded-2xl shadow-medium">
              <svg className="w-10 h-10 text-wine-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="ml-6">
              <p className="text-lg font-bold text-wine-500 mb-2">총 주문</p>
              <p className="text-4xl font-black text-wine-800">{totalOrders}</p>
            </div>
          </div>

          <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 border border-ivory-200/50 flex items-center transition-all duration-300 hover:-translate-y-2 hover:shadow-large animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl shadow-medium">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-6">
              <p className="text-lg font-bold text-wine-500 mb-2">평균 주문</p>
              <p className="text-4xl font-black text-wine-800">
                ₩{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>

        {/* 상세 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* 메뉴별 판매 통계 */}
          <div className="bg-gradient-ivory rounded-3xl shadow-soft border border-ivory-200/50 overflow-hidden animate-slide-up">
            <div className="px-8 py-6 border-b border-ivory-200/50 bg-ivory-100/30">
              <h2 className="text-2xl font-black text-wine-800">메뉴별 판매 현황</h2>
            </div>
            <div className="p-8">
              {menuStats.length > 0 ? (
                <div className="space-y-4">
                  {menuStats.slice(0, 10).map((menu, index) => (
                    <div key={menu.name} className="flex items-center justify-between p-4 bg-ivory-100/50 rounded-2xl border border-ivory-200 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                      <div>
                        <h3 className="text-lg font-bold text-wine-800">{menu.name}</h3>
                        <p className="text-wine-500 font-medium">{menu.quantity}개 판매</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-wine-600">₩{menu.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-wine-400 text-xl font-medium text-center py-12">판매 데이터가 없습니다.</p>
              )}
            </div>
          </div>

          {/* 교회 그룹별 통계 */}
          <div className="bg-gradient-ivory rounded-3xl shadow-soft border border-ivory-200/50 overflow-hidden animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="px-8 py-6 border-b border-ivory-200/50 bg-ivory-100/30">
              <h2 className="text-2xl font-black text-wine-800">교회 그룹별 현황</h2>
            </div>
            <div className="p-8">
              {groupStats.length > 0 ? (
                <div className="space-y-4">
                  {groupStats.slice(0, 10).map((group, index) => (
                    <div key={group.name} className="flex items-center justify-between p-4 bg-ivory-100/50 rounded-2xl border border-ivory-200 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                      <div>
                        <h3 className="text-lg font-bold text-wine-800">{group.name}</h3>
                        <p className="text-wine-500 font-medium">{group.orders}건 주문</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-wine-600">₩{group.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-wine-400 text-xl font-medium text-center py-12">그룹별 데이터가 없습니다.</p>
              )}
            </div>
          </div>
        </div>

        {/* 시간대별 주문 통계 */}
        <div className="bg-gradient-ivory rounded-3xl shadow-soft border border-ivory-200/50 overflow-hidden animate-slide-up">
          <div className="px-8 py-6 border-b border-ivory-200/50 bg-ivory-100/30">
            <h2 className="text-2xl font-black text-wine-800">시간대별 주문 현황</h2>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-6 md:grid-cols-12 gap-4">
              {hourlyStats.map((count, hour) => (
                <div key={hour} className="text-center animate-fade-in" style={{animationDelay: `${hour * 0.05}s`}}>
                  <div className="bg-ivory-100/50 p-4 rounded-2xl border border-ivory-200">
                    <p className="text-lg font-bold text-wine-700 mb-2">{hour}시</p>
                    <p className="text-2xl font-black text-wine-600">{count}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 