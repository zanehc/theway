import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { getSalesStatistics } from "~/lib/database";
import Header from "~/components/Header";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'today';

    // 새로운 매출 통계 함수 사용
    const salesStats = await getSalesStatistics(period as 'today' | 'week' | 'month');

    return json({
      period,
      ...salesStats,
    });
  } catch (error) {
    console.error('Reports loader error:', error);
    return json({
      period: 'today',
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
    });
  }
}

export default function Reports() {
  const { period, totalRevenue, totalOrders, confirmedOrders, pendingOrders, cancelledOrders, menuStats, statusStats } = useLoaderData<typeof loader>();
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-6">
              <p className="text-lg font-bold text-wine-500 mb-2">결제완료</p>
              <p className="text-4xl font-black text-wine-800">{confirmedOrders}</p>
            </div>
          </div>

          <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 border border-ivory-200/50 flex items-center transition-all duration-300 hover:-translate-y-2 hover:shadow-large animate-slide-up" style={{animationDelay: '0.3s'}}>
            <div className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl shadow-medium">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-6">
              <p className="text-lg font-bold text-wine-500 mb-2">결제대기</p>
              <p className="text-4xl font-black text-wine-800">{pendingOrders}</p>
            </div>
          </div>
        </div>

        {/* 주문 상태별 통계 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 border border-ivory-200/50 animate-slide-up">
            <h3 className="text-2xl font-black text-wine-800 mb-6">주문 상태별 통계</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-soft">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-400 rounded-full mr-3"></div>
                  <span className="text-lg font-bold text-wine-800">대기</span>
                </div>
                <span className="text-2xl font-black text-wine-800">{statusStats.pending}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-soft">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-400 rounded-full mr-3"></div>
                  <span className="text-lg font-bold text-wine-800">제조중</span>
                </div>
                <span className="text-2xl font-black text-wine-800">{statusStats.preparing}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-soft">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-400 rounded-full mr-3"></div>
                  <span className="text-lg font-bold text-wine-800">완료</span>
                </div>
                <span className="text-2xl font-black text-wine-800">{statusStats.ready}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-soft">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-wine-400 rounded-full mr-3"></div>
                  <span className="text-lg font-bold text-wine-800">픽업완료</span>
                </div>
                <span className="text-2xl font-black text-wine-800">{statusStats.completed}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-white rounded-2xl shadow-soft">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-400 rounded-full mr-3"></div>
                  <span className="text-lg font-bold text-wine-800">취소</span>
                </div>
                <span className="text-2xl font-black text-wine-800">{statusStats.cancelled}</span>
              </div>
            </div>
          </div>

          {/* 메뉴별 판매 통계 */}
          <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 border border-ivory-200/50 animate-slide-up">
            <h3 className="text-2xl font-black text-wine-800 mb-6">메뉴별 판매 통계</h3>
            {menuStats.length > 0 ? (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {menuStats.map((menu, index) => (
                  <div key={index} className="bg-white rounded-2xl p-4 shadow-soft">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-lg font-bold text-wine-800">{menu.name}</span>
                      <span className="text-lg font-black text-wine-600">₩{menu.revenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-wine-500">
                      <span>판매 수량: {menu.quantity}개</span>
                      <span>평균 단가: ₩{(menu.revenue / menu.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-wine-400 text-lg">판매 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 