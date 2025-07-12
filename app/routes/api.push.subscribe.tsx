import { json, type ActionFunctionArgs } from '@remix-run/node';
import { createServerSupabaseClient } from '~/lib/supabase';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { subscription, userId } = await request.json();
    
    if (!subscription || !userId) {
      return json({ error: 'Missing subscription or userId' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // 기존 구독이 있는지 확인
    const { data: existingSubscription } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existingSubscription) {
      // 기존 구독 업데이트
      const { error } = await supabase
        .from('push_subscriptions')
        .update({
          subscription_data: subscription,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating push subscription:', error);
        return json({ error: 'Failed to update subscription' }, { status: 500 });
      }
    } else {
      // 새 구독 생성
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          subscription_data: subscription,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating push subscription:', error);
        return json({ error: 'Failed to create subscription' }, { status: 500 });
      }
    }

    console.log('✅ Push subscription saved for user:', userId);
    return json({ success: true });

  } catch (error) {
    console.error('Error in push subscription API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
} 