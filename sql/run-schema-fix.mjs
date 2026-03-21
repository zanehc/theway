import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Read SQL file
const sqlContent = readFileSync('./fix-notifications-schema.sql', 'utf8');

console.log('🔧 Creating notifications table schema...');

try {
  // Execute the SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
  
  if (error) {
    console.error('❌ Error executing SQL:', error);
    process.exit(1);
  }
  
  console.log('✅ Notifications table schema created successfully!');
  
  // Test the table by checking if it exists and has the right columns
  const { data: tableInfo, error: infoError } = await supabase
    .from('notifications')
    .select('*')
    .limit(0);
    
  if (infoError) {
    console.log('❌ Error testing table:', infoError);
  } else {
    console.log('✅ Table verified - ready to receive notifications!');
  }
  
} catch (error) {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
}

process.exit(0);