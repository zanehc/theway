import { supabase } from './supabase';
import type { Menu, Order, OrderItem, User, OrderWithItems, UserOrderHistory, OrderStatusUpdate } from '~/types';

// Menu queries
export async function getMenus() {
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Get menus error:', error);
    return [];
  }
  return data as Menu[];
}

export async function getMenusByCategory(category: string) {
  const { data, error } = await supabase
    .from('menus')
    .select('*')
    .eq('category', category)
    .eq('is_available', true)
    .order('name', { ascending: true });

  if (error) {
    console.error('Get menus by category error:', error);
    return [];
  }
  return data as Menu[];
}

// Order queries
export async function getOrders(status?: string) {
  console.log('🔍 getOrders called with status:', status);
  
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu:menus (*)
      )
    `)
    .order('created_at', { ascending: false });

  if (status) {
    console.log('🔍 Adding status filter:', status);
    query = query.eq('status', status);
    // 픽업완료 필터일 때 결제완료 제외
    if (status === 'completed') {
      query = query.neq('payment_status', 'confirmed');
    }
  }

  console.log('🔍 Executing query...');
  const { data, error } = await query;
  
  if (error) {
    console.error('Get orders error:', error);
    return [];
  }
  
  console.log('🔍 getOrders result:', data);
  console.log('🔍 getOrders result length:', data?.length || 0);
  return data as OrderWithItems[];
}

export async function getOrdersByUserId(userId: string, limit?: number) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu:menus (*)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Get orders by user id error:', error);
    return [];
  }
  return data as OrderWithItems[];
}

export async function getTodayOrdersByStatus(status: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu:menus (*)
      )
    `)
    .eq('status', status)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: true }); // 오래된 순으로 정렬

  if (error) {
    console.error('Get today orders by status error:', error);
    return [];
  }
  return data as OrderWithItems[];
}

export async function getUserOrderHistory(userId: string): Promise<UserOrderHistory> {
  const orders = await getOrdersByUserId(userId);
  
  const total_orders = orders.length;
  const total_spent = orders
    .filter(order => order.payment_status === 'confirmed')
    .reduce((sum, order) => sum + order.total_amount, 0);
  
  const recent_orders = orders.slice(0, 5); // 최근 5개 주문

  return {
    orders,
    total_orders,
    total_spent,
    recent_orders,
  };
}

export async function getOrderById(id: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu:menus (*)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Get order by id error:', error);
    return null;
  }
  return data as OrderWithItems;
}

export async function createOrder(orderData: {
  user_id?: string;
  customer_name: string;
  church_group?: string;
  total_amount: number;
  payment_method: 'cash' | 'transfer';
  notes?: string;
  items: Array<{
    menu_id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes?: string;
  }>;
}) {
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: orderData.user_id,
        customer_name: orderData.customer_name,
        church_group: orderData.church_group,
        total_amount: orderData.total_amount,
        payment_method: orderData.payment_method,
        notes: orderData.notes,
        status: 'pending', // 기본 상태
        payment_status: 'pending', // 기본 결제 상태
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insert order items
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      menu_id: item.menu_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
}

export async function updateOrderStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update order status error:', error);
    throw error;
  }
  return data as Order;
}

export async function updatePaymentStatus(id: string, payment_status: string) {
  const { data, error } = await supabase
    .from('orders')
    .update({ 
      payment_status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update payment status error:', error);
    throw error;
  }
  return data as Order;
}

// Sales statistics
export async function getSalesStatistics(period: 'today' | 'week' | 'month' = 'today') {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default: // today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        menu:menus (*)
      )
    `)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', now.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Get sales statistics error:', error);
    return {
      totalRevenue: 0,
      totalOrders: 0,
      confirmedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      menuStats: [],
      statusStats: {
        pending: 0,
        preparing: 0,
        ready: 0,
        completed: 0,
        cancelled: 0,
      }
    };
  }

  let totalRevenue = 0;
  let totalOrders = orders?.length || 0;
  let confirmedOrders = 0;
  let pendingOrders = 0;
  let cancelledOrders = 0;
  const menuStats = new Map();
  const statusStats = {
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
  };

  orders?.forEach((order: any) => {
    // 상태별 통계
    statusStats[order.status as keyof typeof statusStats]++;

    // 결제 상태별 통계
    if (order.payment_status === 'confirmed') {
      totalRevenue += order.total_amount;
      confirmedOrders++;
    } else if (order.payment_status === 'pending') {
      pendingOrders++;
    }

    if (order.status === 'cancelled') {
      cancelledOrders++;
    }

    // 메뉴별 통계
    order.order_items?.forEach((item: any) => {
      const menuName = item.menu?.name || 'Unknown';
      const existing = menuStats.get(menuName) || { quantity: 0, revenue: 0 };
      menuStats.set(menuName, {
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.total_price,
      });
    });
  });

  return {
    totalRevenue,
    totalOrders,
    confirmedOrders,
    pendingOrders,
    cancelledOrders,
    menuStats: Array.from(menuStats.entries()).map(([name, stats]) => ({
      name,
      ...stats,
    })).sort((a, b) => b.quantity - a.quantity),
    statusStats,
  };
}

// User queries
export async function getUserById(id: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Get user by id error:', error);
    return null;
  }
  return data as User;
}

export async function getUsersByRole(role: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('name', { ascending: true });

  if (error) {
    console.error('Get users by role error:', error);
    return [];
  }
  return data as User[];
}

// 오늘의 현재 주문 상태 통계 조회
export async function getTodayOrderStatusStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString());

  if (error) {
    console.error('Get today order status stats error:', error);
    return {
      pending: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
      confirmedOrders: 0
    };
  }

  const statusStats = {
    pending: 0,
    preparing: 0,
    ready: 0,
    completed: 0,
    cancelled: 0,
  };
  let confirmedOrders = 0;

  orders?.forEach((order: any) => {
    // 현재 상태별 통계
    statusStats[order.status as keyof typeof statusStats]++;
    
    // 결제완료 주문 수
    if (order.payment_status === 'confirmed') {
      confirmedOrders++;
    }
  });

  return {
    ...statusStats,
    confirmedOrders
  };
}

// 최근 4주간 주간매출 조회
export async function getWeeklySalesForLast4Weeks() {
  const now = new Date();
  const weeks = [];
  
  // 현재 날짜에서 가장 가까운 일요일 찾기
  const currentDay = now.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const daysToSunday = currentDay === 0 ? 0 : 7 - currentDay; // 다음 일요일까지의 일수
  
  // 가장 가까운 일요일 계산
  const nearestSunday = new Date(now);
  nearestSunday.setDate(nearestSunday.getDate() + daysToSunday);
  nearestSunday.setHours(23, 59, 59, 999);
  
  // 최근 4주간의 주간 데이터 생성 (가장 가까운 일요일부터 역순으로)
  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(nearestSunday);
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    weekEnd.setHours(23, 59, 59, 999);
    
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    
    weeks.push({
      weekNumber: 4 - i,
      startDate: weekStart,
      endDate: weekEnd,
      label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
    });
  }
  
  const weeklyStats = [];
  
  for (const week of weeks) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', week.startDate.toISOString())
      .lte('created_at', week.endDate.toISOString());
    
    if (error) {
      console.error('Get weekly sales error:', error);
      weeklyStats.push({
        weekNumber: week.weekNumber,
        label: week.label,
        orderCompletedRevenue: 0,
        paymentConfirmedRevenue: 0
      });
      continue;
    }
    
    let orderCompletedRevenue = 0;
    let paymentConfirmedRevenue = 0;
    
    orders?.forEach((order: any) => {
      // 주문완료 상태인 주문의 매출
      if (order.status === 'completed') {
        orderCompletedRevenue += order.total_amount;
      }
      
      // 결제완료 상태인 주문의 매출
      if (order.payment_status === 'confirmed') {
        paymentConfirmedRevenue += order.total_amount;
      }
    });
    
    weeklyStats.push({
      weekNumber: week.weekNumber,
      label: week.label,
      orderCompletedRevenue,
      paymentConfirmedRevenue
    });
  }
  
  return weeklyStats;
}

// 일별 매출 조회 (주문이 일어난 일자들만)
export async function getDailySales(startDate?: string, endDate?: string) {
  let query = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  // 기간 필터링 적용
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    query = query.gte('created_at', start.toISOString());
  }
  
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error('Get daily sales error:', error);
    return [];
  }

  // 일별로 그룹화
  const dailyMap = new Map();
  
  orders?.forEach((order: any) => {
    const orderDate = new Date(order.created_at);
    const dateKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        orderCompletedRevenue: 0,
        paymentConfirmedRevenue: 0
      });
    }
    
    const daily = dailyMap.get(dateKey);
    
    // 주문완료 상태인 주문의 매출
    if (order.status === 'completed') {
      daily.orderCompletedRevenue += order.total_amount;
    }
    
    // 결제완료 상태인 주문의 매출
    if (order.payment_status === 'confirmed') {
      daily.paymentConfirmedRevenue += order.total_amount;
    }
  });

  // 날짜순으로 정렬 (최신순)
  return Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

// 알림 생성
export async function createNotification({ user_id, order_id, type, message }: { user_id: string, order_id: string, type: string, message: string }) {
  console.log('🔔 Creating notification:', { user_id, order_id, type, message });
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id,
      order_id,
      type,
      message,
    });
    
  if (error) {
    console.error('❌ Create notification error:', error);
    throw error;
  } else {
    console.log('✅ Notification created successfully');
  }
} 