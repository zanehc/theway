import { supabase } from './supabase';

const AUTH_STORAGE_KEY = 'theway-cafe-auth-token';

export async function signOutAndClearSession() {
  const { error } = await supabase.auth.signOut({ scope: 'local' });

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (storageError) {
      console.warn('Failed to clear auth storage:', storageError);
    }

    try {
      Object.keys(window.sessionStorage).forEach((key) => {
        if (key.startsWith('user_role_')) {
          window.sessionStorage.removeItem(key);
        }
      });
    } catch (storageError) {
      console.warn('Failed to clear role cache:', storageError);
    }
  }

  if (error) {
    console.error('Logout error:', error);
  }

  return { error };
}
