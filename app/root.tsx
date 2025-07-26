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
  const { ENV } = useLoaderData<typeof loader>();
  const [user, setUser] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const getInitialUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Failed to get initial user:', error);
      }
    };

    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
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
        <NotificationProvider userId={user?.id}>
          <Outlet />
          <div id="modal-root" />
          <BottomNavigation />
          {isClient && <GlobalToast />}
        </NotificationProvider>
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__ENV = ${JSON.stringify(ENV)};`,
          }}
        />
      </body>
    </html>
  );
}


export function HydrateFallback() {
  return <p>Loading...</p>;
}

