import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { createServerSupabaseClient } from '~/lib/supabase';
import type { Notification } from '~/types';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return json({ notifications: [] });
  }

  const supabase = createServerSupabaseClient();

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching notifications:', error);
    return json({ notifications: [] });
  }

  return json({ notifications: notifications || [] });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const notificationId = formData.get('notificationId') as string;

  const supabase = createServerSupabaseClient();

  if (intent === 'markAsRead' && notificationId) {
    const { error } = await supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return json({ success: false, error: error.message });
    }

    return json({ success: true });
  }

  return json({ success: false, error: 'Invalid intent' });
} 