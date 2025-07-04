import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Coffee, Users, BarChart3, Settings } from "lucide-react";

export const meta: MetaFunction = () => {
  return [
    { title: "교회 카페 주문 시스템 - 홈" },
    { name: "description", content: "교회 카페를 위한 효율적인 주문 및 관리 시스템" },
  ];
};

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-ivory-50 to-warm-brown-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-ivory-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-wine-red-600 rounded-lg flex items-center justify-center">
                <Coffee className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-warm-brown-900">
                교회 카페 주문 시스템
              </h1>
            </div>
            <nav className="flex space-x-4">
              <Link 
                to="/login" 
                className="text-warm-brown-600 hover:text-wine-red-600 transition-colors"
              >
                로그인
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 히어로 섹션 */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-warm-brown-900 mb-4">
            교회 카페를 위한<br />
            <span className="text-wine-red-600">스마트한 주문 시스템</span>
          </h2>
          <p className="text-lg text-warm-brown-600 max-w-2xl mx-auto">
            효율적인 주문 관리, 실시간 현황판, 그리고 상세한 매출 분석까지.<br />
            교회 카페 운영을 더욱 편리하고 체계적으로 만들어보세요.
          </p>
        </div>

        {/* 기능 카드 섹션 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-wine-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Coffee className="w-6 h-6 text-wine-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-warm-brown-900 mb-2">
              빠른 주문 접수
            </h3>
            <p className="text-warm-brown-600 text-sm">
              직관적인 인터페이스로 빠르고 정확한 주문 접수
            </p>
          </div>

          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-ivory-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-warm-brown-600" />
            </div>
            <h3 className="text-lg font-semibold text-warm-brown-900 mb-2">
              실시간 현황판
            </h3>
            <p className="text-warm-brown-600 text-sm">
              주문 상태를 한눈에 확인할 수 있는 실시간 현황판
            </p>
          </div>

          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-warm-brown-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-6 h-6 text-warm-brown-600" />
            </div>
            <h3 className="text-lg font-semibold text-warm-brown-900 mb-2">
              매출 분석
            </h3>
            <p className="text-warm-brown-600 text-sm">
              일별, 주별, 월별 매출 현황과 인기 메뉴 분석
            </p>
          </div>

          <div className="card text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-ivory-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Settings className="w-6 h-6 text-warm-brown-600" />
            </div>
            <h3 className="text-lg font-semibold text-warm-brown-900 mb-2">
              메뉴 관리
            </h3>
            <p className="text-warm-brown-600 text-sm">
              메뉴 추가, 수정, 삭제를 위한 편리한 관리 도구
            </p>
          </div>
        </div>

        {/* CTA 섹션 */}
        <div className="text-center">
          <div className="card max-w-2xl mx-auto">
            <h3 className="text-2xl font-semibold text-warm-brown-900 mb-4">
              지금 시작해보세요
            </h3>
            <p className="text-warm-brown-600 mb-6">
              교회 카페 운영을 더욱 효율적으로 만들어보세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/order" 
                className="btn-primary inline-flex items-center justify-center"
              >
                주문하기
              </Link>
              <Link 
                to="/admin" 
                className="btn-secondary inline-flex items-center justify-center"
              >
                관리자 페이지
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="bg-warm-brown-900 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-ivory-300">
              © 2024 교회 카페 주문 시스템. 모든 권리 보유.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 