import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createAdminUser() {
  try {
    console.log('관리자 계정을 생성하는 중...');

    // 1. 사용자 계정 생성
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@naver.com',
      password: 'adminadmin',
      email_confirm: true,
      user_metadata: {
        name: '관리자',
        role: 'admin'
      }
    });

    if (authError) {
      console.error('사용자 생성 오류:', authError);
      return;
    }

    console.log('사용자 계정 생성 완료:', authData.user.email);

    // 2. users 테이블에 관리자 정보 추가
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'admin@naver.com',
        name: '관리자',
        role: 'admin',
        church_group: '관리자'
      })
      .select()
      .single();

    if (userError) {
      console.error('사용자 정보 저장 오류:', userError);
      return;
    }

    console.log('관리자 정보 저장 완료:', userData);

    console.log('\n✅ 관리자 계정 생성 완료!');
    console.log('이메일: admin@naver.com');
    console.log('비밀번호: adminadmin');
    console.log('역할: admin');

  } catch (error) {
    console.error('관리자 계정 생성 중 오류 발생:', error);
  }
}

createAdminUser(); 