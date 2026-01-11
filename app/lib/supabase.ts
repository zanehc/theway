import { createClient } from '@supabase/supabase-js';

// 클라이언트/서버 환경 분기
const isBrowser = typeof window !== 'undefined';

// 환경 변수 가져오기 함수 (클라이언트에서 지연 로딩 지원)
function getSupabaseUrl(): string {
  if (isBrowser) {
    // 클라이언트: window.__ENV에서 가져오기 (없으면 process.env fallback)
    return (window as any).__ENV?.SUPABASE_URL || process.env.SUPABASE_URL || '';
  }
  // 서버: process.env에서 가져오기
  return process.env.SUPABASE_URL || '';
}

function getSupabaseAnonKey(): string {
  if (isBrowser) {
    // 클라이언트: window.__ENV에서 가져오기 (없으면 process.env fallback)
    return (window as any).__ENV?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  }
  // 서버: process.env에서 가져오기
  return process.env.SUPABASE_ANON_KEY || '';
}

function getSupabaseServiceKey(): string | undefined {
  if (isBrowser) {
    return (window as any).__ENV?.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

// Supabase 클라이언트를 지연 초기화 (클라이언트에서 window.__ENV가 설정되기 전에 로드되는 경우 대비)
let supabaseClient: ReturnType<typeof createClient> | null = null;

function initSupabaseClient(): ReturnType<typeof createClient> {
  // 이미 초기화되었으면 재사용
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    console.error('⚠️ Supabase 환경 변수 누락:', {
      url: url ? '설정됨' : '누락',
      key: key ? '설정됨' : '누락',
      isBrowser,
      windowENV: isBrowser ? (window as any).__ENV : 'N/A'
    });
    throw new Error('Supabase URL 또는 Anon Key가 설정되지 않았습니다. window.__ENV를 확인해주세요.');
  }

  supabaseClient = createClient(url, key, {
    auth: {
      // PKCE flow 사용 (서버에서 code를 세션으로 교환)
      flowType: 'pkce',
      // 자동 토큰 갱신 활성화
      autoRefreshToken: true,
      // 세션 감지 활성화
      detectSessionInUrl: true,
      // 토큰 저장소 설정 (localStorage 사용)
      storage: isBrowser ? window.localStorage : undefined,
      // 세션 지속성 향상
      persistSession: true,
      // 세션 저장소 키를 명시적으로 설정하여 일관성 보장
      storageKey: 'theway-cafe-auth-token',
    },
    // 전역 설정
    global: {
      headers: {
        'X-Client-Info': 'theway-cafe-app'
      }
    }
  });

  console.log('✅ Supabase 클라이언트 초기화 완료:', url);
  return supabaseClient;
}

// 서버에서 서비스 롤 키로 인증된 클라이언트 생성
export const createServerSupabaseClient = () => {
  const serviceKey = getSupabaseServiceKey();
  if (!isBrowser && serviceKey) {
    return createClient(getSupabaseUrl(), serviceKey);
  }
  return getSupabaseClient();
};

// 기본 클라이언트 접근자 (필요할 때 생성)
function getSupabaseClient(): ReturnType<typeof createClient> {
  try {
    return initSupabaseClient();
  } catch (error) {
    console.error('❌ Supabase 클라이언트 초기화 실패:', error);
    throw error;
  }
}

// 기존 코드 호환성을 위해 export (Proxy를 통해 lazy initialization)
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

// Storage 헬퍼 함수들
export const uploadMenuImage = async (file: File, menuId: string): Promise<string | null> => {
  try {
    console.log('🔄 Starting image upload for menu:', menuId);
    console.log('📁 File details:', { name: file.name, size: file.size, type: file.type });

    // 서버에서는 서비스 롤, 클라이언트에서는 anon
    const client = !isBrowser && getSupabaseServiceKey() ? createServerSupabaseClient() : getSupabaseClient();

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${menuId}-${timestamp}-${randomId}.${fileExt}`;

    console.log('📝 Generated filename:', fileName);

    const { data, error } = await client.storage
      .from('menu-images')
      .upload(fileName, file, {
        cacheControl: '0', // 캐시 비활성화로 즉시 반영
        upsert: false
      });

    if (error) {
      console.error('❌ Storage upload error:', error);
      return null;
    }

    console.log('✅ Upload successful:', data);

    // 공개 URL 생성
    const { data: { publicUrl } } = client.storage
      .from('menu-images')
      .getPublicUrl(fileName);

    // 캐시 버스팅을 위한 타임스탬프 추가
    const finalUrl = `${publicUrl}?t=${timestamp}`;

    console.log('🔗 Generated public URL:', finalUrl);
    return finalUrl;
  } catch (error) {
    console.error('❌ Upload error:', error);
    return null;
  }
};

export const deleteMenuImage = async (imageUrl: string): Promise<boolean> => {
  try {
    console.log('🗑️ Starting image deletion:', imageUrl);

    // URL에서 파일명 추출 (캐시 버스팅 파라미터 제거)
    let fileName = imageUrl.split('/').pop();
    if (!fileName) {
      console.error('❌ No filename found in URL:', imageUrl);
      return false;
    }

    // 캐시 버스팅 파라미터 제거 (?t=timestamp)
    if (fileName.includes('?')) {
      fileName = fileName.split('?')[0];
    }

    console.log('📝 Extracted filename:', fileName);

    const client = !isBrowser && getSupabaseServiceKey() ? createServerSupabaseClient() : getSupabaseClient();
    const { error } = await client.storage
      .from('menu-images')
      .remove([fileName]);

    if (error) {
      console.error('❌ Delete error:', error);
      return false;
    }

    console.log('✅ Image deleted successfully:', fileName);
    return true;
  } catch (error) {
    console.error('❌ Delete error:', error);
    return false;
  }
};

export const getMenuImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  const url = getSupabaseUrl();
  return `${url}/storage/v1/object/public/menu-images/${imageUrl}`;
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