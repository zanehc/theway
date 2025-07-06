import { useState } from 'react';
import { Link } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

interface HamburgerMenuProps {
  user: any;
  userRole: string | null;
  onLogout: () => void;
}

export function HamburgerMenu({ user, userRole, onLogout }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await onLogout();
    closeMenu();
  };

  return (
    <div className="relative">
      {/* 햄버거 버튼 */}
      <button
        onClick={toggleMenu}
        className="p-2 rounded-lg bg-wine-100 hover:bg-wine-200 text-wine-700 transition-colors"
        aria-label="메뉴 열기"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 메뉴 드롭다운 */}
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeMenu}
          />
          
          {/* 메뉴 패널 */}
          <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-2xl border border-ivory-200 z-50 py-2">
            {user ? (
              <>
                {/* 사용자 정보 */}
                <div className="px-4 py-3 border-b border-ivory-200">
                  <div className="text-sm font-bold text-wine-800">{user.name || user.email}</div>
                  <div className="text-xs text-wine-600">{userRole === 'admin' ? '관리자' : '일반 사용자'}</div>
                </div>

                {/* 메뉴 항목들 */}
                <div className="py-2">
                  <Link
                    to="/orders"
                    onClick={closeMenu}
                    className="flex items-center px-4 py-2 text-sm text-wine-700 hover:bg-wine-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    주문 현황
                  </Link>

                  <Link
                    to="/orders/new"
                    onClick={closeMenu}
                    className="flex items-center px-4 py-2 text-sm text-wine-700 hover:bg-wine-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    새 주문
                  </Link>

                  {userRole === 'admin' && (
                    <>
                      <Link
                        to="/menus"
                        onClick={closeMenu}
                        className="flex items-center px-4 py-2 text-sm text-wine-700 hover:bg-wine-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        메뉴 관리
                      </Link>

                      <Link
                        to="/reports"
                        onClick={closeMenu}
                        className="flex items-center px-4 py-2 text-sm text-wine-700 hover:bg-wine-50 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        매출 보고
                      </Link>
                    </>
                  )}

                  <div className="border-t border-ivory-200 my-2" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <div className="py-2">
                <button
                  onClick={closeMenu}
                  className="flex items-center w-full px-4 py-2 text-sm text-wine-700 hover:bg-wine-50 transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  로그인
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 