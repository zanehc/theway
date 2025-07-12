import { json, type ActionFunctionArgs } from '@remix-run/node';
import { createServerSupabaseClient } from '~/lib/supabase';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { subscription, userId } = await request.json();
    
    if (!userId) {
      return json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 구독 정보 삭제
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing push subscription:', error);
      return json({ error: 'Failed to remove subscription' }, { status: 500 });
    }

    console.log('✅ Push subscription removed for user:', userId);
    return json({ success: true });

  } catch (error) {
    console.error('Error in push unsubscribe API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
} 