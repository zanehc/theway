import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndSetUserRole() {
  try {
    console.log('🔍 사용자 역할 확인 중...');
    
    // 모든 사용자 조회
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, created_at');
    
    if (usersError) {
      console.error('❌ 사용자 조회 오류:', usersError);
      return;
    }
    
    console.log(`📊 총 ${users.length}명의 사용자가 있습니다.`);
    
    // 역할이 없는 사용자 찾기
    const usersWithoutRole = users.filter(user => !user.role);
    const usersWithRole = users.filter(user => user.role);
    
    console.log(`✅ 역할이 설정된 사용자: ${usersWithRole.length}명`);
    console.log(`❌ 역할이 없는 사용자: ${usersWithoutRole.length}명`);
    
    if (usersWithRole.length > 0) {
      console.log('\n📋 역할이 설정된 사용자 목록:');
      usersWithRole.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }
    
    if (usersWithoutRole.length > 0) {
      console.log('\n📋 역할이 없는 사용자 목록:');
      usersWithoutRole.forEach(user => {
        console.log(`  - ${user.email} (역할 없음)`);
      });
      
      // 역할 설정 여부 확인
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('\n❓ 역할이 없는 사용자들에게 기본 역할을 설정하시겠습니까? (y/n): ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() === 'y') {
        console.log('\n🔧 사용자 역할 설정 중...');
        
        for (const user of usersWithoutRole) {
          // 이메일로 관리자 여부 판단 (임시 로직)
          const isAdmin = user.email.includes('admin') || user.email.includes('관리자');
          const role = isAdmin ? 'admin' : 'customer';
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ role })
            .eq('id', user.id);
          
          if (updateError) {
            console.error(`❌ ${user.email} 역할 설정 실패:`, updateError);
          } else {
            console.log(`✅ ${user.email} -> ${role}로 설정됨`);
          }
        }
        
        console.log('\n🎉 역할 설정이 완료되었습니다!');
      }
    }
    
    // 특정 사용자 역할 확인
    const testEmail = 'hyungchangyoun@gmail.com'; // 테스트용 이메일
    const testUser = users.find(user => user.email === testEmail);
    
    if (testUser) {
      console.log(`\n🔍 테스트 사용자 (${testEmail}) 역할: ${testUser.role || '설정되지 않음'}`);
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

checkAndSetUserRole(); 