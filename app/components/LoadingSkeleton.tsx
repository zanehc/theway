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
    <div className="min-h-screen bg-gradient-warm pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        {/* 브랜딩 섹션 스켈레톤 */}
        <div className="text-center mb-12 animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg w-96 mx-auto mb-4"></div>
          <div className="h-6 bg-gray-200 rounded-lg w-64 mx-auto"></div>
        </div>

        {/* 통계 카드 스켈레톤 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 animate-pulse">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-12 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>

        {/* 교회소식 스켈레톤 */}
        <div className="mb-12 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 h-32">
                <div className="text-center mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}