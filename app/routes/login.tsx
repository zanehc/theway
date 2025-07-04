import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, Link } from "@remix-run/react";
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Coffee } from "lucide-react";
import { supabase } from "~/lib/supabase.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // 이미 로그인된 사용자는 리다이렉트
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("returnTo") || "/";
  
  // 여기서 세션 체크 로직을 추가할 수 있습니다
  // 현재는 간단한 구현을 위해 생략
  
  return json({ returnTo });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const returnTo = formData.get("returnTo") as string;

  if (!email || !password) {
    return json({ error: "이메일과 비밀번호를 입력해주세요." }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return json({ error: "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요." }, { status: 400 });
    }

    // 로그인 성공 시 리다이렉트
    return redirect(returnTo || "/admin");
  } catch (error) {
    console.error("로그인 오류:", error);
    return json({ error: "로그인 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-ivory-50 to-warm-brown-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-wine-red-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-warm-brown-900 mb-2">
            교회 카페 주문 시스템
          </h1>
          <p className="text-warm-brown-600">
            관리자 로그인
          </p>
        </div>

        {/* 로그인 폼 */}
        <div className="card">
          <Form method="post" className="space-y-6">
            <input type="hidden" name="returnTo" value="/admin" />
            
            {actionData?.error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {actionData.error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-warm-brown-700 mb-2">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-warm-brown-400" />
                <input
                  type="email"
                  name="email"
                  required
                  className="input-field pl-10"
                  placeholder="이메일을 입력하세요"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-warm-brown-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-warm-brown-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  className="input-field pl-10 pr-10"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-warm-brown-400 hover:text-warm-brown-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full btn-primary py-3"
            >
              로그인
            </button>
          </Form>

          <div className="mt-6 text-center">
            <p className="text-sm text-warm-brown-600">
              계정이 없으신가요?{" "}
              <Link 
                to="/register" 
                className="text-wine-red-600 hover:text-wine-red-700 font-medium"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>

        {/* 데모 계정 정보 */}
        <div className="mt-6 card bg-ivory-100 border-ivory-300">
          <h3 className="text-sm font-medium text-warm-brown-900 mb-2">
            데모 계정 (개발용)
          </h3>
          <div className="text-xs text-warm-brown-600 space-y-1">
            <p>이메일: admin@church-cafe.com</p>
            <p>비밀번호: admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
} 