import { createClient } from '@supabase/supabase-js';

// 서버 사이드에서는 process.env 사용, 클라이언트에서는 window.__ENV 사용
const supabaseUrl = typeof window !== 'undefined' 
  ? window.__ENV?.SUPABASE_URL || process.env.SUPABASE_URL!
  : process.env.SUPABASE_URL!;

const supabaseAnonKey = typeof window !== 'undefined'
  ? window.__ENV?.SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
  : process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 타입 선언
declare global {
  interface Window {
    __ENV?: {
      SUPABASE_URL?: string;
      SUPABASE_ANON_KEY?: string;
    };
  }
} 