import { json, redirect, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import { useState } from "react";
import { supabase } from "~/lib/supabase";
import { LoginForm } from "~/components/LoginForm";
import { SignupForm } from "~/components/SignupForm";

export async function loader({ request }: LoaderFunctionArgs) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    return redirect('/');
  }
  
  return json({});
}

export default function LoginPage() {
  const [loginSuccess, setLoginSuccess] = useState(false);

  const handleLoginSuccess = () => {
    console.log('✅ 로그인 성공 - 홈으로 리다이렉트');
    setLoginSuccess(true);
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
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


          <LoginForm 
            onSwitchToSignup={() => {}}
            onLoginSuccess={handleLoginSuccess}
          />

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              로그인하면 주문 및 관리 서비스를 이용할 수 있습니다
            </p>
          </div>
        </div>
      </div>
      
      {/* 로그인 성공 메시지 */}
      {loginSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-2xl font-bold text-lg flex items-center gap-3 animate-fade-in">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>로그인 성공! 홈으로 이동합니다...</span>
        </div>
      )}
    </div>
  );
} 