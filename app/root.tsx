import type { LinksFunction, MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { useState, useEffect } from "react";
import tailwindHref from "./tailwind.css?url";
import BottomNavigation from "./components/BottomNavigation";
import Header from "./components/Header";
import { NotificationProvider } from "./contexts/NotificationContext";
import { GlobalToast } from "./components/GlobalToast";
import { supabase } from "./lib/supabase";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: tailwindHref },
  // Preconnect for Google Fonts
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  // Google Fonts - Noto Sans KR (한국어) + Inter (영문) with display=swap
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
];

export const meta: MetaFunction = () => {
  return [
    { title: "길을여는교회 이음카페" },
    { name: "description", content: "길을여는교회 이음카페 주문 및 관리 시스템" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    ENV: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Safari 호환성을 위해 항상 useLoaderData 호출
  const loaderData = useLoaderData<typeof loader>();

  // 환경 변수 처리 - 서버/클라이언트 분리
  let ENV: any = {};

  if (typeof window === 'undefined') {
    // 서버에서는 loader 데이터 사용
    ENV = loaderData?.ENV || {};
  } else if (isClient) {
    // 클라이언트에서 하이드레이션 완료 후 window.__ENV 사용
    ENV = (window as any).__ENV || {};
  }

  useEffect(() => {
    setIsClient(true);

    const getInitialUser = async () => {
      try {
        console.log('🔐 Root - 초기 사용자 인증 상태 확인 (getSession 사용)');

        // getSession()으로 로컬 캐시된 세션을 먼저 확인 (더 빠름)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('🔐 Root - 세션 가져오기 실패:', sessionError);
          setUser(null);
          setUserRole(null);
          return;
        }

        const user = session?.user || null;
        console.log('🔐 Root - 세션에서 사용자 정보:', user?.email || 'null');
        setUser(user);

        if (user) {
          // Safari 호환성을 위한 안전한 세션스토리지 접근
          let cachedRole: string | null = null;
          try {
            cachedRole = sessionStorage.getItem(`user_role_${user.id}`);
            if (cachedRole) {
              console.log('🔐 Root - 캐시된 역할 사용:', cachedRole);
              setUserRole(cachedRole);
            }
          } catch (storageError) {
            console.warn('🔐 Root - 세션스토리지 접근 실패:', storageError);
          }

          // 역할 정보 업데이트
          try {
            const { data: userData, error: roleError } = await supabase
              .from('users')
              .select('role')
              .eq('id', user.id)
              .single();

            if (!roleError && userData?.role) {
              const roleValue = userData.role as string;
              console.log('🔐 Root - DB에서 역할 확인:', roleValue);
              setUserRole(roleValue);

              // Safari 호환성을 위한 안전한 세션스토리지 저장
              try {
                sessionStorage.setItem(`user_role_${user.id}`, roleValue);
              } catch (storageError) {
                console.warn('🔐 Root - 세션스토리지 저장 실패:', storageError);
              }
            } else {
              console.log('🔐 Root - 역할 정보 없음, 기본값 설정');
              setUserRole('customer');
            }
          } catch (roleError) {
            console.error('🔐 Root - 역할 정보 가져오기 실패:', roleError);
            setUserRole('customer');
          }
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('🔐 Root - 초기 인증 처리 실패:', error);
        setUser(null);
        setUserRole(null);
      } finally {
        setAuthChecked(true);
      }
    };

    getInitialUser();

    console.log('🔐 Root - 인증 상태 변경 리스너 설정');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Root - 인증 상태 변경:', event, session?.user?.email || 'null');

        if (event === 'SIGNED_OUT') {
          // localStorage에 토큰이 남아있으면 네트워크 오류/탭이동으로 인한 가짜 SIGNED_OUT → 무시
          try {
            const stored = localStorage.getItem('theway-cafe-auth-token');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.access_token) return;
            }
          } catch {}

          setUser(null);
          setUserRole(null);
          try {
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('user_role_')) sessionStorage.removeItem(key);
            });
          } catch {}
          return;
        }

        // 세션 없는 이벤트는 무시 (탭 이동 등 INITIAL_SESSION 이벤트에서 세션 없을 수 있음)
        if (!session?.user) {
          console.log('🔐 Root - 세션 없음, 무시:', event);
          return;
        }

        // 로그인/세션 갱신 처리
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('🔐 Root - 로그인/토큰 갱신 처리');
          setUser(session.user);

          // 캐시 확인 → 있으면 즉시 적용하고 DB 쿼리 스킵
          let cachedRole: string | null = null;
          try {
            cachedRole = sessionStorage.getItem(`user_role_${session.user.id}`);
          } catch (e) {}

          if (cachedRole) {
            console.log('🔐 Root - 캐시된 역할 즉시 적용:', cachedRole);
            setUserRole(cachedRole);
            return;
          }

          // 캐시 미스: 낙관적으로 'customer' 즉시 설정 후 DB에서 실제 역할 확인
          setUserRole('customer');

          try {
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();

            const role = (userData?.role as string) || 'customer';
            console.log('🔐 Root - DB 역할 확인 후 업데이트:', role);
            setUserRole(role);

            try {
              sessionStorage.setItem(`user_role_${session.user.id}`, role);
            } catch (storageError) {
              console.warn('🔐 Root - 세션스토리지 저장 실패 (인증 변경):', storageError);
            }
          } catch (error) {
            console.error('🔐 Root - 역할 정보 실패:', error);
          }
        }
      }
    );

    return () => {
      console.log('🔐 Root - 인증 리스너 정리');
      subscription.unsubscribe();
    };
  }, []);


  return (
    <html lang="ko" className="h-full bg-ivory-50" suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* 환경 변수를 가장 먼저 설정 (다른 스크립트보다 앞서 실행) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = ${JSON.stringify(loaderData?.ENV || {})};`,
          }}
        />
      </head>
      <body className="h-full min-h-screen bg-ivory-50" suppressHydrationWarning>
        <NotificationProvider userId={user?.id} userRole={userRole}>
          <div className="app-container">
            <div className="main-content pb-24">
              <Outlet context={{ user, userRole, authChecked }} />
            </div>
            <div id="modal-root" />
            {isClient && <BottomNavigation user={user} />}
          </div>
          {isClient && <GlobalToast />}
        </NotificationProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}


export function HydrateFallback() {
  return <p>Loading...</p>;
}

