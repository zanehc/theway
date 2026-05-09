import { supabase } from './supabase';

const AUTH_STORAGE_KEY = 'theway-cafe-auth-token';

export async function signOutAndClearSession() {
  // 스토리지를 먼저 지워서 redirect 후 getSession()이 null을 반환하도록 보장
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
    try {
      Object.keys(window.sessionStorage).forEach((key) => {
        if (key.startsWith('user_role_')) window.sessionStorage.removeItem(key);
      });
    } catch {}
  }

  // signOut은 2초 안에 안 끝나면 건너뜀 (네트워크 지연 대비)
  try {
    await Promise.race([
      supabase.auth.signOut({ scope: 'local' }),
      new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {}
}
