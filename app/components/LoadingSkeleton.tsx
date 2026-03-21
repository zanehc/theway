// 로딩 스켈레톤 컴포넌트들

export function OrderListSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-warm pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        {/* 헤더 스켈레톤 */}
        <div className="mb-12 animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg w-48 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded-lg w-64"></div>
        </div>

        {/* 필터 버튼 스켈레톤 */}
        <div className="flex flex-wrap gap-3 mb-8 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-2xl w-24"></div>
          ))}
        </div>

        {/* 주문 카드 스켈레톤 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl shadow-soft p-6 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded-full w-20"></div>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function MenuListSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-warm pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        {/* 헤더 스켈레톤 */}
        <div className="mb-12 animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg w-48 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded-lg w-64"></div>
        </div>

        {/* 카테고리 탭 스켈레톤 */}
        <div className="flex gap-4 mb-8 overflow-x-auto animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded-2xl min-w-24"></div>
          ))}
        </div>

        {/* 메뉴 그리드 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white rounded-3xl shadow-soft overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-10 bg-gray-200 rounded-2xl w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-warm pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        {/* 헤더 스켈레톤 */}
        <div className="mb-12 animate-pulse">
          <div className="h-12 bg-gray-200 rounded-lg w-48 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded-lg w-64"></div>
        </div>

        {/* 기간 선택 스켈레톤 */}
        <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 mb-12 animate-pulse">
          <div className="flex gap-4 items-center">
            <div className="h-6 bg-gray-200 rounded w-20"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-2xl w-20"></div>
            ))}
          </div>
        </div>

        {/* 통계 카드 스켈레톤 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gradient-ivory rounded-3xl shadow-soft p-8 animate-pulse">
              <div className="flex items-center">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl mr-6"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 차트 스켈레톤 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gradient-ivory rounded-3xl shadow-soft p-8 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-16 bg-gray-200 rounded-2xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-ivory-100 pb-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
        {/* 헤더 스켈레톤 */}
        <div className="flex justify-between items-center mb-3 animate-pulse">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-ivory-200 rounded-xl"></div>
            <div className="h-5 bg-ivory-200 rounded w-20"></div>
          </div>
          <div className="h-5 bg-ivory-200 rounded w-16"></div>
        </div>

        {/* 주문 버튼 스켈레톤 */}
        <div className="h-14 bg-ivory-200 rounded-xl mb-4 animate-pulse"></div>

        {/* 카테고리 스켈레톤 */}
        <div className="grid grid-cols-4 gap-2 mb-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-ivory-200 rounded-xl"></div>
          ))}
        </div>

        {/* 인기 메뉴 스켈레톤 */}
        <div className="animate-pulse">
          <div className="h-5 bg-ivory-200 rounded w-20 mb-2"></div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-36 bg-ivory-200 rounded-xl h-44"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}