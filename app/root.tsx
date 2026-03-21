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
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" },
  { rel: "stylesheet", href: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" },
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
  
  // Safari 호환성을 위해 항상 useLoaderData 호출
  const loaderData = useLoaderData<typeof loader>();
  
  useEffect(() => {
    setIsClient(true);

    const getInitialUser = async () => {
      try {
        // getSession()으로 먼저 시도
        let currentUser = null;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          currentUser = session?.user || null;
        } catch {}

        // getSession 실패 시 localStorage에서 직접 복구 시도
        if (!currentUser) {
          try {
            const stored = localStorage.getItem('theway-cafe-auth-token');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.access_token) {
                // 토큰이 있으면 getUser로 검증
                const { data: { user } } = await supabase.auth.getUser();
                currentUser = user;
              }
            }
          } catch {}
        }

        if (!currentUser) {
          setUser(null);
          setUserRole(null);
          return;
        }

        setUser(currentUser);

        // 캐시된 역할을 즉시 표시 (깜빡임 방지)
        let cachedRole: string | null = null;
        try {
          cachedRole = sessionStorage.getItem(`user_role_${currentUser.id}`);
          if (cachedRole) {
            setUserRole(cachedRole);
          }
        } catch {}

        // DB에서 역할 업데이트 (백그라운드)
        try {
          const { data: userData, error: roleError } = await supabase
            .from('users')
            .select('role')
            .eq('id', currentUser.id)
            .single();

          if (!roleError && userData?.role) {
            setUserRole(userData.role);
            try {
              sessionStorage.setItem(`user_role_${currentUser.id}`, userData.role);
            } catch {}
          } else if (!cachedRole) {
            setUserRole('customer');
          }
        } catch {
          if (!cachedRole) setUserRole('customer');
        }
      } catch {
        setUser(null);
        setUserRole(null);
      }
    };

    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Root - 인증 상태 변경:', event, session?.user?.email || 'null');

        // SIGNED_OUT 처리 - 네트워크 오류로 인한 거짓 로그아웃 방지
        if (event === 'SIGNED_OUT') {
          // localStorage에 세션 토큰이 남아있으면 네트워크 오류로 인한 거짓 SIGNED_OUT
          try {
            const stored = localStorage.getItem('theway-cafe-auth-token');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.access_token) {
                console.log('🔐 Root - 네트워크 오류로 인한 거짓 SIGNED_OUT 무시');
                return;
              }
            }
          } catch {}

          console.log('🔐 Root - 로그아웃 처리');
          setUser(null);
          setUserRole(null);
          try {
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('user_role_')) {
                sessionStorage.removeItem(key);
              }
            });
          } catch {}
          return;
        }

        // 로그인/세션 갱신 처리 - 세션이 있을 때만
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          setUser(session.user);

          // INITIAL_SESSION은 getInitialUser에서 이미 처리하므로 역할 재조회 생략
          if (event === 'INITIAL_SESSION') return;

          try {
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();

            const role = userData?.role || 'customer';
            setUserRole(role);

            try {
              sessionStorage.setItem(`user_role_${session.user.id}`, role);
            } catch {}
          } catch (error) {
            console.error('🔐 Root - 역할 정보 실패:', error);
            setUserRole('customer');
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
        {/* 환경 변수를 모든 JS보다 먼저 설정 - loaderData에서 직접 읽어 타이밍 이슈 방지 */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = ${JSON.stringify(loaderData?.ENV || {})};`,
          }}
        />
      </head>
      <body className="h-full min-h-screen bg-ivory-50" suppressHydrationWarning>
        <NotificationProvider userId={user?.id} userRole={userRole}>
          <div className="app-container">
            <div className="main-content pb-24">
              <Outlet context={{ user, userRole }} />
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

