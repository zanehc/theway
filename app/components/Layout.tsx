import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import Header from './Header';
import { NotificationProvider } from '~/contexts/NotificationContext';
import { GlobalToast } from './GlobalToast';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 초기 사용자 정보 가져오기
    const getInitialUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Failed to get initial user:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialUser();

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="text-wine-700 font-bold">로딩 중...</div>
      </div>
    );
  }

  return (
    <NotificationProvider userId={user?.id}>
      <div className="min-h-screen bg-ivory-50">
        <Header />
        <main>{children}</main>
        <GlobalToast />
      </div>
    </NotificationProvider>
  );
}