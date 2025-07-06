import { createClient } from '@supabase/supabase-js';

// 서버 사이드에서는 process.env 사용, 클라이언트에서는 window.__ENV 사용
const supabaseUrl = typeof window !== 'undefined' 
  ? window.__ENV?.SUPABASE_URL || process.env.SUPABASE_URL!
  : process.env.SUPABASE_URL!;

const supabaseAnonKey = typeof window !== 'undefined'
  ? window.__ENV?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
  : process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage 헬퍼 함수들
export const uploadMenuImage = async (file: File, menuId: string): Promise<string | null> => {
  try {
    console.log('=== UPLOAD MENU IMAGE START ===');
    console.log('File:', { name: file.name, size: file.size, type: file.type });
    console.log('Menu ID:', menuId);
    
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${menuId}-${timestamp}-${randomId}.${fileExt}`;
    
    console.log('Generated filename:', fileName);
    
    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    console.log('Upload successful, data:', data);

    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(fileName);

    console.log('Generated public URL:', publicUrl);
    console.log('=== UPLOAD MENU IMAGE SUCCESS ===');
    
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
};

export const deleteMenuImage = async (imageUrl: string): Promise<boolean> => {
  try {
    // URL에서 파일명 추출
    const fileName = imageUrl.split('/').pop();
    if (!fileName) return false;

    const { error } = await supabase.storage
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
  
  // 이미 완전한 URL인 경우
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // 상대 경로인 경우 Supabase Storage URL로 변환
  return `${supabaseUrl}/storage/v1/object/public/menu-images/${imageUrl}`;
};

// 타입 선언
declare global {
  interface Window {
    __ENV?: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
} 