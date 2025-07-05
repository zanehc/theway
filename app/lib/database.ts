import { supabase } from './supabase';
import type { Menu, Order, OrderItem, User, OrderWithItems } from '~/types';

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
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Get orders error:', error);
    return [];
  }
  return data as OrderWithItems[];
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
    .update({ status })
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
    .update({ payment_status })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update payment status error:', error);
    throw error;
  }
  return data as Order;
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