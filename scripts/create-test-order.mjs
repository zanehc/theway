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

async function createTestOrder() {
  try {
    console.log('테스트 주문 생성 중...');
    
    // 먼저 사용자 계정 확인 (테스트용)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'customer')
      .limit(1);
    
    if (usersError) {
      console.error('사용자 조회 오류:', usersError);
      return;
    }
    
    let userId = null;
    if (users && users.length > 0) {
      userId = users[0].id;
      console.log('테스트용 사용자 ID:', userId);
    } else {
      console.log('⚠️ 테스트용 고객 계정이 없습니다. 알림이 생성되지 않을 수 있습니다.');
    }
    
    // 먼저 메뉴 데이터 확인
    const { data: menus, error: menusError } = await supabase
      .from('menus')
      .select('id, name, price')
      .limit(3);
    
    if (menusError) {
      console.error('메뉴 조회 오류:', menusError);
      return;
    }
    
    if (!menus || menus.length === 0) {
      console.error('메뉴가 없습니다. 먼저 메뉴를 생성해주세요.');
      return;
    }
    
    console.log('사용 가능한 메뉴:', menus);
    
    // 테스트 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: '테스트고객',
        church_group: '테스트목장',
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'cash',
        total_amount: menus[0].price * 2,
        user_id: userId // 테스트용 사용자 ID 포함
      })
      .select()
      .single();
    
    if (orderError) {
      console.error('주문 생성 오류:', orderError);
      return;
    }
    
    console.log('주문 생성됨:', order);
    
    // 주문 아이템 생성 (필수 필드 포함)
    const orderItems = [
      {
        order_id: order.id,
        menu_id: menus[0].id,
        quantity: 2,
        unit_price: menus[0].price,
        total_price: menus[0].price * 2
      }
    ];
    
    if (menus.length > 1) {
      orderItems.push({
        order_id: order.id,
        menu_id: menus[1].id,
        quantity: 1,
        unit_price: menus[1].price,
        total_price: menus[1].price * 1
      });
    }
    
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select();
    
    if (itemsError) {
      console.error('주문 아이템 생성 오류:', itemsError);
      return;
    }
    
    console.log('주문 아이템 생성됨:', items);
    console.log('✅ 테스트 주문이 성공적으로 생성되었습니다!');
    console.log(`주문 ID: ${order.id}`);
    console.log(`고객명: ${order.customer_name}`);
    console.log(`상태: ${order.status}`);
    console.log(`사용자 ID: ${order.user_id || '없음'}`);
    console.log(`알림 생성 여부: ${order.user_id ? '예' : '아니오'}`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

createTestOrder(); 