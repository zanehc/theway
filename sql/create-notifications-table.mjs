import { createClient } from '@supabase/supabase-js';

// Use the same environment setup as the app
const supabaseUrl = process.env.SUPABASE_URL || 'https://uqbgvjzuvsdkiozfkpek.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  console.log('Please set the service role key to run database migrations');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 Creating notifications table...');

const createTableSQL = `
-- Create notifications table with proper schema
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_order_id_idx ON public.notifications(order_id);
CREATE INDEX IF NOT EXISTS notifications_status_idx ON public.notifications(status);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow system to insert notifications (for server-side operations)
CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.notifications TO postgres, anon, authenticated;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated;
`;

try {
  // For Supabase, we need to use the REST API to execute SQL
  // Since we don't have a direct SQL execution method, let's try using the table creation
  
  // First, let's check if the table already exists
  const { data: existingTable, error: checkError } = await supabase
    .from('notifications')
    .select('*')
    .limit(1);

  if (checkError && checkError.code === 'PGRST116') {
    console.log('📝 Table does not exist, need to create it manually...');
    console.log('Please run the following SQL in your Supabase SQL editor:');
    console.log('----------------------------------------');
    console.log(createTableSQL);
    console.log('----------------------------------------');
  } else if (checkError) {
    console.log('❌ Error checking table:', checkError);
    console.log('Please run this SQL in your Supabase SQL editor:');
    console.log('----------------------------------------');
    console.log(createTableSQL);
    console.log('----------------------------------------');
  } else {
    console.log('✅ Notifications table already exists!');
    
    // Test inserting a notification to verify schema
    console.log('🧪 Testing notification creation...');
    
    // First get a test user and order
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
    
    if (users && users.length > 0 && orders && orders.length > 0) {
      const { data: testNotif, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: users[0].id,
          order_id: orders[0].id,
          type: 'test',
          message: 'Test notification for schema verification'
        })
        .select()
        .single();
        
      if (insertError) {
        console.log('❌ Error creating test notification:', insertError);
        console.log('Schema may need to be updated. Please run this SQL:');
        console.log('----------------------------------------');
        console.log(createTableSQL);
        console.log('----------------------------------------');
      } else {
        console.log('✅ Test notification created successfully!');
        console.log('Schema is working correctly.');
        
        // Clean up test notification
        await supabase
          .from('notifications')
          .delete()
          .eq('id', testNotif.id);
        console.log('🧹 Test notification cleaned up.');
      }
    } else {
      console.log('⚠️  No users or orders found for testing');
    }
  }
  
} catch (error) {
  console.error('❌ Unexpected error:', error);
  console.log('Please run this SQL manually in your Supabase SQL editor:');
  console.log('----------------------------------------');
  console.log(createTableSQL);
  console.log('----------------------------------------');
}

console.log('🏁 Schema verification complete.');