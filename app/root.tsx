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
  // Google Fonts - Inter as Pin Sans substitute + Noto Sans KR fallback.
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
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user || null;
        setUser(user);

        if (user) {
          // 캐시된 역할 즉시 적용 (없으면 낙관적으로 'customer')
          let cachedRole: string | null = null;
          try { cachedRole = sessionStorage.getItem(`user_role_${user.id}`); } catch {}
          setUserRole(cachedRole || 'customer');

          // 세션 확인 즉시 authChecked=true → 최근주문 바로 로딩 가능
          setAuthChecked(true);

          // DB 역할 조회는 백그라운드 (admin 여부 확인용)
          supabase.from('users').select('role').eq('id', user.id).single().then(({ data, error }) => {
            const role = typeof data?.role === 'string' ? data.role : null;
            if (!error && role) {
              setUserRole(role);
              try { sessionStorage.setItem(`user_role_${user.id}`, role); } catch {}
            }
          });
        } else {
          setUserRole(null);
          setAuthChecked(true);
        }
      } catch {
        setUser(null);
        setUserRole(null);
        setAuthChecked(true);
      }
    };

    getInitialUser();

    console.log('🔐 Root - 인증 상태 변경 리스너 설정');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Root - 인증 상태 변경:', event, session?.user?.email || 'null');

        if (event === 'SIGNED_OUT') {
          // SIGNED_OUT은 무시: Supabase v2는 탭전환·네트워크 오류 시 가짜 SIGNED_OUT을 발생시킴
          // 명시적 로그아웃은 signOutAndClearSession() + window.location.replace('/') 로 처리
          return;
        }

        // 세션 없는 이벤트는 무시 (탭 이동 등 INITIAL_SESSION 이벤트에서 세션 없을 수 있음)
        if (!session?.user) {
          console.log('🔐 Root - 세션 없음, 무시:', event);
          return;
        }

        // 로그인/세션 갱신/초기 세션 처리
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          console.log('🔐 Root - 로그인/토큰 갱신 처리');
          setUser(session.user);
          setAuthChecked(true);

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
    <html lang="ko" className="h-full bg-surface-soft" suppressHydrationWarning>
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
      <body className="h-full min-h-screen bg-surface-soft text-body" suppressHydrationWarning>
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
