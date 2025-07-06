import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { getMenus, getOrders, getSalesStatistics } from "~/lib/database";
import Header from "~/components/Header";
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';

// Leaflet 타입 선언
declare global {
  interface Window {
    L: any;
    mapInitialized?: boolean;
  }
}

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

    // 오늘의 매출 통계 조회
    const salesStats = await getSalesStatistics('today');

    return json({
      menuStats,
      orderStats,
      recentOrders: orders.slice(0, 5), // 최근 5개 주문
      totalMenus: menus.length,
      totalOrders: orders.length,
      menus: menus.slice(0, 8), // 홈페이지에 표시할 메뉴 8개
      error,
      success,
      salesStats,
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
      salesStats: {
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
      },
    });
  }
}

export default function Index() {
  const { menuStats, orderStats, recentOrders, totalMenus, totalOrders, menus, error, success, salesStats } = useLoaderData<typeof loader>();
  
  // 로그인 상태 확인
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Leaflet 지도 초기화
  useEffect(() => {
    const initMap = async () => {
      // Leaflet CSS와 JS를 동적으로 로드
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        link.crossOrigin = '';
        document.head.appendChild(link);
      }

      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        script.crossOrigin = '';
        script.onload = () => {
          createMap();
        };
        document.head.appendChild(script);
      } else {
        createMap();
      }
    };

    const createMap = () => {
      if (typeof window.L !== 'undefined' && !window.mapInitialized) {
        const map = window.L.map('map').setView([37.5665, 126.9780], 15);
        
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // 길을여는교회 위치 마커 추가
        const churchMarker = window.L.marker([37.5665, 126.9780]).addTo(map);
        churchMarker.bindPopup(`
          <div style="text-align: center;">
            <h3 style="margin: 0 0 10px 0; color: #8B4513; font-weight: bold;">길을여는교회</h3>
            <p style="margin: 0; color: #666;">이음카페</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">서울특별시 강남구</p>
          </div>
        `);

        window.mapInitialized = true;
      }
    };

    initMap();
  }, []);

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
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-20 lg:py-32">
          <div className="text-center animate-fade-in">
            <h1 className="text-6xl lg:text-8xl font-black text-wine-800 mb-6 tracking-tight">
              길을여는교회
            </h1>
            <h2 className="text-4xl lg:text-6xl font-black text-wine-600 mb-8 tracking-tight">
              이음카페
            </h2>
            <p className="text-2xl lg:text-3xl text-wine-500 font-medium mb-12 max-w-4xl mx-auto">
              따뜻한 커피와 함께하는 교제의 공간
            </p>
            
            {!user && (
              <div className="space-y-4">
                <p className="text-xl text-wine-400 font-medium">
                  주문을 하시려면 로그인이 필요합니다
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => {
                      const header = document.querySelector('[data-login-button]') as HTMLElement;
                      if (header) header.click();
                    }}
                    className="px-8 py-4 bg-gradient-wine text-ivory-50 rounded-2xl text-xl font-bold hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
                  >
                    로그인하기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 오늘의 현황 */}
      <section className="py-20 lg:py-32 bg-gradient-ivory">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-5xl lg:text-6xl font-black text-wine-800 mb-6 tracking-tight">
              오늘의 현황
            </h2>
            <p className="text-2xl text-wine-600 font-medium">
              {new Date().toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-16">
            {/* 총 주문 */}
            <div className="bg-white rounded-3xl shadow-soft p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-large animate-slide-up">
              <div className="p-4 bg-gradient-wine rounded-2xl shadow-wine inline-block mb-4">
                <svg className="w-10 h-10 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-4xl font-black text-wine-800 mb-2">{salesStats.totalOrders}</h3>
              <p className="text-lg text-wine-600 font-medium">총 주문</p>
            </div>

            {/* 대기중 */}
            <div className="bg-white rounded-3xl shadow-soft p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-large animate-slide-up" style={{animationDelay: '0.1s'}}>
              <div className="p-4 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl shadow-medium inline-block mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-4xl font-black text-wine-800 mb-2">{salesStats.statusStats.pending}</h3>
              <p className="text-lg text-wine-600 font-medium">대기중</p>
            </div>

            {/* 완료 */}
            <div className="bg-white rounded-3xl shadow-soft p-8 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-large animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl shadow-medium inline-block mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-4xl font-black text-wine-800 mb-2">{salesStats.statusStats.completed}</h3>
              <p className="text-lg text-wine-600 font-medium">완료</p>
            </div>

            {/* 지도 */}
            <div className="bg-white rounded-3xl shadow-soft p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-large animate-slide-up" style={{animationDelay: '0.3s'}}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-wine-800">위치</h3>
                <div className="p-2 bg-gradient-wine rounded-xl shadow-wine">
                  <svg className="w-6 h-6 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
              <div id="map" className="w-full h-32 rounded-2xl bg-ivory-100"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 운영시간 */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-5xl lg:text-6xl font-black text-wine-800 mb-6 tracking-tight">
              운영시간
            </h2>
            <p className="text-2xl text-wine-600 font-medium">
              매주 일요일 오후 1시 ~ 2시
            </p>
          </div>

          <div className="bg-gradient-ivory rounded-3xl shadow-soft p-12 text-center animate-slide-up">
            <div className="max-w-2xl mx-auto">
              <div className="text-6xl font-black text-wine-800 mb-6">
                일요일
              </div>
              <div className="text-4xl font-bold text-wine-600 mb-8">
                13:00 - 14:00
              </div>
              <p className="text-xl text-wine-500 font-medium">
                예배 후 교제 시간에 운영됩니다
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
