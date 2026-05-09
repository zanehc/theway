import { createClient } from '@supabase/supabase-js';
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';

export async function loader({ request }: LoaderFunctionArgs) {
  return json({ error: 'Method not allowed' }, { status: 405 });
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, { status: 405 });

  const adminSupabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { news } = await request.json();

  const { error } = await adminSupabase
    .from('church_news')
    .upsert(
      { id: 'singleton', news, updated_at: new Date().toISOString() },
      { onConflict: 'id' }
    );

  if (error) return json({ success: false, error: error.message }, { status: 500 });
  return json({ success: true });
}
