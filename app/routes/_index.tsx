import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getMenus, getOrders } from "~/lib/database";
import Header from "~/components/Header";

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

    return json({
      menuStats,
      orderStats,
      recentOrders: orders.slice(0, 5), // 최근 5개 주문
      totalMenus: menus.length,
      totalOrders: orders.length,
      menus: menus.slice(0, 8), // 홈페이지에 표시할 메뉴 8개
      error,
      success,
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
    });
  }
}

export default function Index() {
  const { menuStats, orderStats, recentOrders, totalMenus, totalOrders, menus, error, success } = useLoaderData<typeof loader>();
  
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
      
      {/* 히어로 섹션 */}
      <section className="relative bg-gradient-ivory min-h-[600px] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* 왼쪽 콘텐츠 */}
            <div className="animate-fade-in">
              <h1 className="text-5xl lg:text-6xl font-black text-wine-800 mb-6 tracking-tight leading-tight">
                믿음과 나눔이<br />
                <span className="text-wine-600">있는 공간</span>
              </h1>
              <p className="text-xl text-wine-600 mb-8 leading-relaxed">
                따뜻한 커피 한 잔과 함께 나누는 진심 어린 대화.<br />
                길을여는교회 이음카페에서 특별한 시간을 경험하세요.
              </p>
              
              {/* 주요 기능 버튼 */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <a 
                  href="/orders/new" 
                  className="bg-gradient-wine hover:bg-wine-800 text-ivory-50 px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1 text-lg text-center"
                >
                  새 주문하기
                </a>
                <a 
                  href="/orders" 
                  className="bg-ivory-200/80 hover:bg-wine-100 text-wine-700 border border-wine-300 px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-soft hover:shadow-medium transform hover:-translate-y-1 text-lg text-center"
                >
                  주문 현황 보기
                </a>
              </div>

              {/* 운영 정보 */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-wine-600 mr-3 rounded-full"></div>
                  <span className="text-wine-600 font-medium">평일 09:00 - 21:00</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-wine-600 mr-3 rounded-full"></div>
                  <span className="text-wine-600 font-medium">길을여는교회 내부</span>
                </div>
              </div>

              {/* 소셜 링크 */}
              <div className="flex items-center gap-4">
                <a href="#" className="text-wine-500 hover:text-wine-700 transition-colors">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
                <a href="#" className="text-wine-500 hover:text-wine-700 transition-colors">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
                <a href="#" className="text-wine-500 hover:text-wine-700 transition-colors">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* 오른쪽 이미지/통계 */}
            <div className="relative animate-slide-up">
              <div className="bg-gradient-wine rounded-3xl p-8 shadow-large">
                <h3 className="text-2xl font-black text-ivory-50 mb-6">오늘의 현황</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-black text-ivory-50 mb-2">{totalMenus}</div>
                    <div className="text-ivory-200 font-medium">총 메뉴</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-ivory-50 mb-2">{totalOrders}</div>
                    <div className="text-ivory-200 font-medium">총 주문</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-ivory-50 mb-2">{(orderStats as any).pending || 0}</div>
                    <div className="text-ivory-200 font-medium">대기 중</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-black text-ivory-50 mb-2">{(orderStats as any).completed || 0}</div>
                    <div className="text-ivory-200 font-medium">완료</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 하단 배너 */}
      <div className="bg-wine-50 py-6 px-4 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <p className="text-wine-800 font-medium text-center sm:text-left mb-4 sm:mb-0">
              이번 주 특별 이벤트: 성경 공부 모임 - 화요일 저녁 7시
            </p>
            <a href="#" className="text-wine-700 hover:text-wine-900 font-bold transition-colors">
              자세히 보기 →
            </a>
          </div>
        </div>
      </div>

      {/* 인기 메뉴 섹션 */}
      <section className="py-16 bg-gradient-warm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-wine-800 mb-4">인기 메뉴</h2>
            <p className="text-xl text-wine-600">고객들이 가장 많이 찾는 메뉴들을 만나보세요</p>
          </div>
          
          {menus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {menus.map((menu, index) => menu && (
                <div key={menu.id} className="bg-white rounded-2xl shadow-medium hover:shadow-large transition-all duration-300 transform hover:-translate-y-2 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="h-48 overflow-hidden bg-gradient-to-br from-ivory-100 to-ivory-200 rounded-t-2xl flex items-center justify-center">
                    {menu.image_url ? (
                      <img 
                        src={menu.image_url} 
                        alt={menu.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-bold text-wine-800">{menu.name}</h3>
                      <span className="text-wine-700 font-bold">₩{menu.price.toLocaleString()}</span>
                    </div>
                    {menu.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{menu.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className={`status-badge mobile-horizontal-text text-xs ${
                        menu.category === 'hot coffee' ? 'bg-red-100 text-red-800' :
                        menu.category === 'ice coffee' ? 'bg-blue-100 text-blue-800' :
                        menu.category === 'tea' ? 'bg-orange-100 text-orange-800' :
                        menu.category === 'beverage' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {menu.category === 'hot coffee' ? 'Hot 커피' :
                         menu.category === 'ice coffee' ? 'Ice 커피' :
                         menu.category === 'tea' ? '차' :
                         menu.category === 'beverage' ? '음료' : menu.category}
                      </span>
                      <a 
                        href="/orders/new" 
                        className="text-wine-600 hover:text-wine-800 transition-colors text-sm font-bold"
                      >
                        주문하기 →
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600 mx-auto mb-4"></div>
              <p className="text-lg text-wine-400 font-medium">메뉴를 불러오는 중...</p>
            </div>
          )}
          
          <div className="text-center mt-8">
            <a 
              href="/orders/new" 
              className="bg-gradient-wine text-ivory-50 px-8 py-4 rounded-xl font-bold transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1 text-lg inline-block"
            >
              전체 메뉴 보기
            </a>
          </div>
        </div>
      </section>

      {/* 최근 주문 섹션 */}
      <section className="py-16 bg-gradient-warm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="bg-gradient-ivory rounded-3xl shadow-soft border border-ivory-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-ivory-200/50 bg-ivory-100/30">
              <h2 className="text-2xl font-black text-wine-800">최근 주문</h2>
            </div>
            {recentOrders.length > 0 ? (
              <div className="divide-y divide-ivory-200/50">
                {recentOrders.map((order, index) => order && (
                  <div key={order.id} className="p-6 hover:bg-ivory-100/50 transition-all duration-300 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4">
                      <h3 className="text-xl font-bold text-wine-800">{order.customer_name}</h3>
                      <span className={`status-badge mobile-horizontal-text ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'ready' ? 'bg-green-100 text-green-800' :
                        order.status === 'completed' ? 'bg-wine-100 text-wine-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'pending' ? '대기' :
                          order.status === 'preparing' ? '제조중' :
                          order.status === 'ready' ? '완료' :
                          order.status === 'completed' ? '픽업완료' : '취소'}
                      </span>
                      {order.church_group && (
                        <span className="status-badge mobile-horizontal-text bg-ivory-200 text-wine-700">
                          {order.church_group}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-wine-500 text-sm font-bold">
                      {new Date(order.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-wine-400 text-lg font-medium">최근 주문이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
