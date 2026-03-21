import { supabase } from './supabase';

/**
 * 통일된 로그아웃 함수
 * signOut()이 Safari에서 hang될 수 있으므로 fire-and-forget + 로컬 세션 직접 정리
 */
export function logout() {
  supabase.auth.signOut().catch(() => {});
  localStorage.removeItem('theway-cafe-auth-token');
  sessionStorage.clear();
  window.location.href = '/';
}
