import { Outlet, useOutletContext, useNavigate } from "@remix-run/react";
import { useEffect } from "react";

export default function AdminLayout() {
  const { user, userRole } = useOutletContext<{ user: any; userRole: string | null }>();
  const navigate = useNavigate();

  useEffect(() => {
    // 아직 로딩 중 (로그인된 사용자의 role 조회 중)
    if (user && userRole === null) return;
    // 비로그인
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // 관리자가 아님
    if (userRole !== 'admin') {
      navigate('/', { replace: true });
    }
  }, [user, userRole, navigate]);

  // role 로딩 중 스피너
  if (userRole === null) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wine-600" />
      </div>
    );
  }

  // redirect 진행 중에는 아무것도 렌더링하지 않음
  if (userRole !== 'admin') return null;

  return <Outlet context={{ user, userRole }} />;
}
