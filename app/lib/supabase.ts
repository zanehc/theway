import { createClient } from '@supabase/supabase-js';

// 클라이언트/서버 환경 분기
const isBrowser = typeof window !== 'undefined';

// 클라이언트는 window.__ENV, 서버는 process.env
const supabaseUrl = isBrowser
  ? window.__ENV?.SUPABASE_URL
  : process.env.SUPABASE_URL;

const supabaseAnonKey = isBrowser
  ? window.__ENV?.SUPABASE_ANON_KEY
  : process.env.SUPABASE_ANON_KEY;

// 서비스 롤 키도 동일하게 분기
const supabaseServiceKey = isBrowser
  ? window.__ENV?.SUPABASE_SERVICE_ROLE_KEY
  : process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL 또는 Anon Key가 설정되지 않았습니다.');
}

// 서버에서 서비스 롤 키로 인증된 클라이언트 생성
export const createServerSupabaseClient = () => {
  if (!isBrowser && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey!);
  }
  return supabase;
};

// 기본 클라이언트(클라이언트: anon, 서버: anon)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage 헬퍼 함수들
export const uploadMenuImage = async (file: File, menuId: string): Promise<string | null> => {
  try {
    // 서버에서는 서비스 롤, 클라이언트에서는 anon
    const client = !isBrowser && supabaseServiceKey ? createServerSupabaseClient() : supabase;
    
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${menuId}-${timestamp}-${randomId}.${fileExt}`;
    
    const { data, error } = await client.storage
      .from('menu-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    // 공개 URL 생성
    const { data: { publicUrl } } = client.storage
      .from('menu-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
};

export const deleteMenuImage = async (imageUrl: string): Promise<boolean> => {
  try {
    const fileName = imageUrl.split('/').pop();
    if (!fileName) return false;
    const client = !isBrowser && supabaseServiceKey ? createServerSupabaseClient() : supabase;
    const { error } = await client.storage
      .from('menu-images')
      .remove([fileName]);
    if (error) {
      console.error('Delete error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
};

export const getMenuImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  return `${supabaseUrl}/storage/v1/object/public/menu-images/${imageUrl}`;
};

declare global {
  interface Window {
    __ENV?: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
    };
  }
} 