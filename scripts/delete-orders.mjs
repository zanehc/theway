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

async function deleteOrders() {
  try {
    console.log('현재 주문 데이터 확인 중...');
    
    // 현재 주문 데이터 확인
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, customer_name, status, created_at')
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('주문 데이터 조회 오류:', ordersError);
      return;
    }
    
    console.log(`총 ${orders.length}개의 주문이 있습니다:`);
    orders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.customer_name} - ${order.status} (${new Date(order.created_at).toLocaleString()})`);
    });
    
    if (orders.length === 0) {
      console.log('삭제할 주문이 없습니다.');
      return;
    }
    
    console.log('\n주문 아이템 삭제 중...');
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 아이템 삭제
    
    if (itemsError) {
      console.error('주문 아이템 삭제 오류:', itemsError);
      return;
    }
    
    console.log('주문 데이터 삭제 중...');
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 주문 삭제
    
    if (deleteError) {
      console.error('주문 삭제 오류:', deleteError);
      return;
    }
    
    console.log('✅ 모든 주문 데이터가 성공적으로 삭제되었습니다.');
    
    // 삭제 후 확인
    const { count: remainingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });
    
    const { count: remainingItems } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n삭제 후 상태:`);
    console.log(`- 남은 주문: ${remainingOrders}개`);
    console.log(`- 남은 주문 아이템: ${remainingItems}개`);
    
  } catch (error) {
    console.error('오류 발생:', error);
  }
}

deleteOrders(); 