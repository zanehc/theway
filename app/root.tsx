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
        // getSession()은 로컬 캐시에서 먼저 읽어 getUser()보다 훨씬 빠름
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session?.user) {
          setUser(null);
          setUserRole(null);
          return;
        }

        const currentUser = session.user;
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

    console.log('🔐 Root - 인증 상태 변경 리스너 설정');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Root - 인증 상태 변경:', event, session?.user?.email || 'null');
        
        // 로그아웃 이벤트 처리
        if (event === 'SIGNED_OUT' || !session?.user) {
          console.log('🔐 Root - 로그아웃 처리');
          setUser(null);
          setUserRole(null);
          // 캐시 정리
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('user_role_')) {
              sessionStorage.removeItem(key);
            }
          });
          return;
        }

        // 로그인/세션 갱신 처리
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          console.log('🔐 Root - 로그인/토큰 갱신 처리');
          setUser(session.user);
          
          // 역할 정보 가져오기
          try {
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            const role = userData?.role || 'customer';
            console.log('🔐 Root - 새 역할 설정:', role);
            setUserRole(role);
            
            // Safari 호환성을 위한 안전한 세션스토리지 저장
            try {
              sessionStorage.setItem(`user_role_${session.user.id}`, role);
            } catch (storageError) {
              console.warn('🔐 Root - 세션스토리지 저장 실패 (인증 변경):', storageError);
            }
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
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = ${JSON.stringify(ENV || {})};`,
          }}
        />
      </body>
    </html>
  );
}


export function HydrateFallback() {
  return <p>Loading...</p>;
}

