import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 데이터베이스 타입 정의
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'customer' | 'staff' | 'admin';
          church_group?: string; // 목장 정보
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          role: 'customer' | 'staff' | 'admin';
          church_group?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'customer' | 'staff' | 'admin';
          church_group?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      menus: {
        Row: {
          id: string;
          name: string;
          description?: string;
          price: number;
          category: string;
          image_url?: string;
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          price: number;
          category: string;
          image_url?: string;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          price?: number;
          category?: string;
          image_url?: string;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          customer_name: string;
          church_group?: string;
          total_amount: number;
          status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          payment_method: 'cash' | 'transfer';
          payment_status: 'pending' | 'confirmed';
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          customer_name: string;
          church_group?: string;
          total_amount: number;
          status?: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          payment_method: 'cash' | 'transfer';
          payment_status?: 'pending' | 'confirmed';
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          customer_name?: string;
          church_group?: string;
          total_amount?: number;
          status?: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
          payment_method?: 'cash' | 'transfer';
          payment_status?: 'pending' | 'confirmed';
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_id: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          notes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_id?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          notes?: string;
          created_at?: string;
        };
      };
    };
  };
} 