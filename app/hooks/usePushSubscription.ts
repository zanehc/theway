import { useEffect } from "react";
import { supabase } from "~/lib/supabase";

const VAPID_PUBLIC_KEY = typeof window !== "undefined"
  ? (window as any).__ENV?.VAPID_PUBLIC_KEY
  : undefined;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function registerAndSubscribe() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!VAPID_PUBLIC_KEY) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    // 이미 구독돼 있으면 재사용
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const token = await getToken();
    if (!token) return;

    await fetch("/api/push-subscribe", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription.toJSON()),
    });
  } catch (err) {
    console.error("Push subscription failed:", err);
  }
}

export function usePushSubscription(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;
    // window.__ENV가 hydration 후 설정되므로 약간 지연
    const timer = setTimeout(registerAndSubscribe, 2000);
    return () => clearTimeout(timer);
  }, [userId]);
}
