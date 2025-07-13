import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { supabase } from "~/lib/supabase";

export async function loader({ request }: LoaderFunctionArgs) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    return redirect('/');
  }
  
  return json({});
}

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    
    if (error) {
      console.error('Google login error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4 pb-20">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-soft p-8 border border-ivory-200/50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-wine-800 mb-2">길을여는교회</h1>
            <h2 className="text-2xl font-bold text-wine-600 mb-4">이음카페</h2>
            <p className="text-gray-600">로그인하여 주문 서비스를 이용하세요</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all duration-300 flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Google로 로그인</span>
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                로그인하면 주문 및 관리 서비스를 이용할 수 있습니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 