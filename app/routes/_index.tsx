import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getMenus, getOrders } from "~/lib/database";
import Header from "~/components/Header";

export async function loader({ request }: LoaderFunctionArgs) {
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

    return json({
      menuStats,
      orderStats,
      recentOrders: orders.slice(0, 5), // 최근 5개 주문
      totalMenus: menus.length,
      totalOrders: orders.length,
    });
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return json({
      menuStats: {},
      orderStats: {},
      recentOrders: [],
      totalMenus: 0,
      totalOrders: 0,
    });
  }
}

export default function Index() {
  const { menuStats, orderStats, recentOrders, totalMenus, totalOrders } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-ivory-50 via-white to-ivory-100">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 환영 메시지 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-wine-800 mb-4">
            교회 카페 관리 시스템
          </h1>
          <p className="text-xl text-wine-600 max-w-2xl mx-auto">
            주문 관리, 메뉴 관리, 매출 현황을 한눈에 확인하세요
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-soft p-8 border border-white/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-wine-500 to-wine-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 메뉴</p>
                <p className="text-3xl font-bold text-wine-800">{totalMenus}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-8 border border-white/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 주문</p>
                <p className="text-3xl font-bold text-wine-800">{totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-8 border border-white/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">대기 중</p>
                <p className="text-3xl font-bold text-wine-800">{(orderStats as any).pending || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-8 border border-white/50 backdrop-blur-sm">
            <div className="flex items-center">
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">완료</p>
                <p className="text-3xl font-bold text-wine-800">{(orderStats as any).completed || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 액션 버튼 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <a 
            href="/orders/new" 
            className="group bg-gradient-to-br from-wine-600 to-wine-700 text-white p-8 rounded-2xl shadow-medium hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center">
              <div className="p-2.5 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-6">
                <h3 className="text-xl font-semibold mb-2">새 주문</h3>
                <p className="text-wine-100">고객 주문을 받습니다</p>
              </div>
            </div>
          </a>

          <a 
            href="/orders" 
            className="group bg-gradient-to-br from-ivory-600 to-ivory-700 text-white p-8 rounded-2xl shadow-medium hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center">
              <div className="p-2.5 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-6">
                <h3 className="text-xl font-semibold mb-2">주문 현황</h3>
                <p className="text-ivory-100">현재 주문 상태를 확인합니다</p>
              </div>
            </div>
          </a>

          <a 
            href="/menus" 
            className="group bg-gradient-to-br from-wine-500 to-wine-600 text-white p-8 rounded-2xl shadow-medium hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center">
              <div className="p-2.5 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div className="ml-6">
                <h3 className="text-xl font-semibold mb-2">메뉴 관리</h3>
                <p className="text-wine-100">메뉴를 추가/수정합니다</p>
              </div>
            </div>
          </a>
        </div>

        {/* 최근 주문 */}
        <div className="bg-white rounded-2xl shadow-soft border border-white/50 backdrop-blur-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-bold text-wine-800">최근 주문</h2>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentOrders.map((order) => order && (
                <div key={order.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.customer_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'ready' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'pending' ? '대기' :
                           order.status === 'preparing' ? '제조중' :
                           order.status === 'ready' ? '완료' :
                           order.status === 'completed' ? '픽업완료' : '취소'}
                        </span>
                        {order.church_group && (
                          <span className="px-3 py-1 bg-ivory-200 text-ivory-800 rounded-full text-sm font-medium">
                            {order.church_group}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        {new Date(order.created_at).toLocaleString('ko-KR')}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>결제: {order.payment_method === 'cash' ? '현금' : '계좌이체'}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            order.payment_status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.payment_status === 'confirmed' ? '결제완료' : '결제대기'}
                          </span>
                        </div>
                        <span className="text-xl font-bold text-wine-600">
                          ₩{order.total_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">아직 주문이 없습니다.</p>
              <p className="text-gray-400 text-sm mt-2">새 주문을 시작해보세요!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
