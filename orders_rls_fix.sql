-- Orders table RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

-- Enable RLS on orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to create orders
CREATE POLICY "Users can create orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view their own orders and admins to view all
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (
        user_id = auth.uid() OR
        user_id IS NULL OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admins to update all orders
CREATE POLICY "Admins can update all orders" ON orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Order items table RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Admins can update all order items" ON order_items;

-- Enable RLS on order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to create order items
CREATE POLICY "Users can create order items" ON order_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to view order items for their orders
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE id = order_id AND (
                user_id = auth.uid() OR
                user_id IS NULL OR
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE id = auth.uid() AND role = 'admin'
                )
            )
        )
    );

-- Allow admins to update all order items
CREATE POLICY "Admins can update all order items" ON order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    ); 