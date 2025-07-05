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
    <div className="min-h-screen bg-ivory-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-wine-800 mb-2">매출 보고</h1>
          <p className="text-wine-600">매출 현황과 통계를 확인하세요</p>
        </div>

        {/* 기간 선택 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">기간 선택:</span>
            {['today', 'week', 'month'].map((p) => (
              <button
                key={p}
                onClick={() => {
                  setSelectedPeriod(p);
                  window.location.href = `/reports?period=${p}`;
                }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedPeriod === p 
                    ? 'bg-wine-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getPeriodLabel(p)}
              </button>
            ))}
            <span className="text-sm text-gray-600 ml-4">
              {getPeriodDateRange(selectedPeriod)}
            </span>
          </div>
        </div>

        {/* 주요 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-wine-100 rounded-lg">
                <svg className="w-6 h-6 text-wine-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 매출</p>
                <p className="text-2xl font-bold text-wine-800">₩{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-wine-100 rounded-lg">
                <svg className="w-6 h-6 text-wine-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 주문</p>
                <p className="text-2xl font-bold text-wine-800">{totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-wine-100 rounded-lg">
                <svg className="w-6 h-6 text-wine-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평균 주문액</p>
                <p className="text-2xl font-bold text-wine-800">
                  ₩{totalOrders > 0 ? Math.round(totalRevenue / totalOrders).toLocaleString() : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 인기 메뉴 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-wine-800 mb-6">인기 메뉴</h2>
            {menuStats.length > 0 ? (
              <div className="space-y-4">
                {menuStats.slice(0, 10).map((menu, index) => (
                  <div key={menu.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-wine-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{menu.name}</p>
                        <p className="text-sm text-gray-600">{menu.quantity}개 판매</p>
                      </div>
                    </div>
                    <span className="text-wine-600 font-semibold">₩{menu.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">판매 데이터가 없습니다.</p>
            )}
          </div>

          {/* 목장별 통계 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-wine-800 mb-6">목장별 주문 현황</h2>
            {groupStats.length > 0 ? (
              <div className="space-y-4">
                {groupStats.map((group, index) => (
                  <div key={group.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-ivory-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{group.name}</p>
                        <p className="text-sm text-gray-600">{group.orders}건 주문</p>
                      </div>
                    </div>
                    <span className="text-wine-600 font-semibold">₩{group.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">목장별 데이터가 없습니다.</p>
            )}
          </div>
        </div>

        {/* 시간대별 주문 현황 */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold text-wine-800 mb-6">시간대별 주문 현황</h2>
          <div className="grid grid-cols-12 gap-2">
            {hourlyStats.map((count, hour) => (
              <div key={hour} className="text-center">
                <div className="bg-gray-100 rounded-lg p-2 mb-1">
                  <div 
                    className="bg-wine-600 rounded transition-all duration-300"
                    style={{ 
                      height: `${Math.max(count * 10, 4)}px`,
                      minHeight: '4px'
                    }}
                  ></div>
                </div>
                <span className="text-xs text-gray-600">{hour}시</span>
                <div className="text-xs font-medium text-wine-600">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 주문 목록 */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-xl font-semibold text-wine-800 mb-6">최근 주문</h2>
          {orders.length > 0 ? (
            <div className="space-y-4">
              {orders.slice(0, 10).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">
                      {order.church_group && `${order.church_group} • `}
                      {new Date(order.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.payment_status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.payment_status === 'confirmed' ? '결제완료' : '결제대기'}
                    </span>
                    <span className="text-lg font-semibold text-wine-600">
                      ₩{order.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">주문 내역이 없습니다.</p>
          )}
        </div>
      </main>
    </div>
  );
} 