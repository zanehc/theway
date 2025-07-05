import { Link } from "@remix-run/react";

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-wine-700 to-wine-800 text-white shadow-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">교회 카페</h1>
                <p className="text-xs text-wine-100">주문 관리 시스템</p>
              </div>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-1">
            <Link 
              to="/orders" 
              className="px-4 py-2 rounded-lg text-wine-100 hover:text-white hover:bg-white/10 transition-all duration-200 font-medium"
            >
              주문 현황
            </Link>
            <Link 
              to="/orders/new" 
              className="px-4 py-2 rounded-lg text-wine-100 hover:text-white hover:bg-white/10 transition-all duration-200 font-medium"
            >
              새 주문
            </Link>
            <Link 
              to="/menus" 
              className="px-4 py-2 rounded-lg text-wine-100 hover:text-white hover:bg-white/10 transition-all duration-200 font-medium"
            >
              메뉴 관리
            </Link>
            <Link 
              to="/reports" 
              className="px-4 py-2 rounded-lg text-wine-100 hover:text-white hover:bg-white/10 transition-all duration-200 font-medium"
            >
              매출 보고
            </Link>
          </nav>

          <div className="flex items-center space-x-3">
            <div className="hidden md:flex items-center space-x-2 text-sm text-wine-100">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>시스템 정상</span>
            </div>
            <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all duration-200 font-medium backdrop-blur-sm">
              로그인
            </button>
          </div>
        </div>
      </div>
    </header>
  );
} 