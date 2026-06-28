// User types
export type UserRole = 'customer' | 'staff' | 'admin';

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  church_group: string | null;
  created_at: string;
  updated_at: string;
};

// Menu types
export type Menu = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

// Order types
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'transfer';
export type PaymentStatus = 'pending' | 'confirmed';

export type Order = {
  id: string;
  order_number?: string | null;
  user_id: string | null;
  customer_name: string;
  church_group: string | null;
  total_amount: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes: string | null;
  coupon_id?: string | null;
  discount_amount?: number;
  created_at: string;
  updated_at: string;
};

// Coupon types
export type CouponTargetType = 'user' | 'group';

export type Coupon = {
  id: string;
  discount_percent: number;
  target_type: CouponTargetType;
  target_user_id: string | null;
  target_church_group: string | null;
  description: string | null;
  is_active: boolean;
  used_at: string | null;
  used_by_user_id: string | null;
  used_by_order_id: string | null;
  created_by: string | null;
  created_at: string;
};

// Order Item types
export type OrderItem = {
  id: string;
  order_id: string;
  menu_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
};

// Extended types for joins
export type OrderWithItems = Order & {
  order_items: (OrderItem & { menu: Menu })[];
};

export type OrderItemWithMenu = OrderItem & {
  menu: Menu;
};

// Order status management
export type OrderStatusUpdate = {
  order_id: string;
  status: OrderStatus;
  updated_by?: string;
  notes?: string;
};

// User order history
export type UserOrderHistory = {
  orders: OrderWithItems[];
  total_orders: number;
  total_spent: number;
  recent_orders: OrderWithItems[];
};

export type NotificationStatus = 'unread' | 'read';

export interface Notification {
  id: string;
  user_id: string;
  order_id: string | null;
  type: string;
  message: string;
  status: NotificationStatus;
  created_at: string;
} 
