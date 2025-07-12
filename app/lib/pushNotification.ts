import { createServerSupabaseClient } from './supabase';

interface PushNotificationData {
  title: string;
  message: string;
  tag?: string;
  url?: string;
  orderId?: string;
}

// VAPID 키 (실제 구현 시 환경 변수에서 가져와야 함)
// 클라이언트 사이드에서는 window 객체를 통해 접근하거나, 서버에서만 사용
const VAPID_PUBLIC_KEY = typeof window !== 'undefined' 
  ? (window as any).VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY'
  : process.env.VAPID_PUBLIC_KEY || 'YOUR_VAPID_PUBLIC_KEY';
const VAPID_PRIVATE_KEY = typeof window !== 'undefined'
  ? (window as any).VAPID_PRIVATE_KEY || 'YOUR_VAPID_PRIVATE_KEY'
  : process.env.VAPID_PRIVATE_KEY || 'YOUR_VAPID_PRIVATE_KEY';

// 웹 푸시 알림 전송
export async function sendPushNotification(
  userId: string, 
  data: PushNotificationData
): Promise<boolean> {
  try {
    console.log('📱 Sending push notification to user:', userId, data);
    
    const supabase = createServerSupabaseClient();
    
    // 사용자의 푸시 구독 정보 가져오기
    const { data: subscription, error } = await supabase
      .from('push_subscriptions')
      .select('subscription_data')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      console.log('📱 No push subscription found for user:', userId);
      return false;
    }

    // 웹 푸시 라이브러리 import (실제 구현 시 필요)
    // const webpush = require('web-push');
    
    // VAPID 키 설정
    // webpush.setVapidDetails(
    //   'mailto:your-email@example.com',
    //   VAPID_PUBLIC_KEY,
    //   VAPID_PRIVATE_KEY
    // );

    // 푸시 알림 전송
    // const payload = JSON.stringify({
    //   title: data.title,
    //   message: data.message,
    //   tag: data.tag || 'order-notification',
    //   url: data.url || '/orders',
    //   orderId: data.orderId
    // });

    // const result = await webpush.sendNotification(
    //   subscription.subscription_data,
    //   payload
    // );

    // 임시로 로그만 출력 (실제 구현 시 위의 코드 사용)
    console.log('📱 Push notification would be sent:', {
      userId,
      subscription: subscription.subscription_data,
      data
    });

    return true;

  } catch (error) {
    console.error('📱 Error sending push notification:', error);
    return false;
  }
}

// 주문 상태 변경 시 푸시 알림 전송
export async function sendOrderStatusNotification(
  userId: string,
  order: any,
  newStatus: string,
  oldStatus?: string
): Promise<boolean> {
  const statusMessages: Record<string, { title: string; message: string }> = {
    'preparing': {
      title: '제조 시작',
      message: '주문하신 메뉴 제조가 시작되었습니다'
    },
    'ready': {
      title: '제조 완료',
      message: '주문하신 메뉴가 준비되었습니다. 픽업해 주세요!'
    },
    'completed': {
      title: '픽업 완료',
      message: '주문하신 메뉴 픽업이 완료되었습니다. 감사합니다!'
    },
    'cancelled': {
      title: '주문 취소',
      message: '주문이 취소되었습니다'
    }
  };

  const statusInfo = statusMessages[newStatus];
  if (!statusInfo) {
    console.log('📱 Unknown status for push notification:', newStatus);
    return false;
  }

  const menuNames = order.order_items?.map((item: any) => 
    `${item.menu?.name} ${item.quantity}개`
  ).join(', ') || '주문 메뉴';

  return await sendPushNotification(userId, {
    title: statusInfo.title,
    message: `${statusInfo.message} - ${menuNames}`,
    tag: `order-${order.id}`,
    url: '/orders',
    orderId: order.id
  });
}

// 새 주문 알림 전송 (관리자용)
export async function sendNewOrderNotification(
  adminUserId: string,
  order: any
): Promise<boolean> {
  const customerName = order.customer_name || '새 고객';
  const churchGroup = order.church_group || '';
  const displayName = churchGroup ? `${customerName}(${churchGroup})` : customerName;
  
  const menuNames = order.order_items?.map((item: any) => 
    `${item.menu?.name} ${item.quantity}개`
  ).join(', ') || '주문 메뉴';

  return await sendPushNotification(adminUserId, {
    title: '새 주문 접수',
    message: `${displayName} 님의 주문이 들어왔습니다 - ${menuNames}`,
    tag: `new-order-${order.id}`,
    url: '/orders',
    orderId: order.id
  });
}

// 결제 완료 알림 전송
export async function sendPaymentNotification(
  userId: string,
  order: any
): Promise<boolean> {
  const menuNames = order.order_items?.map((item: any) => 
    `${item.menu?.name} ${item.quantity}개`
  ).join(', ') || '주문 메뉴';

  return await sendPushNotification(userId, {
    title: '결제 완료',
    message: `주문하신 ${menuNames}의 결제가 완료되었습니다`,
    tag: `payment-${order.id}`,
    url: '/orders',
    orderId: order.id
  });
} 