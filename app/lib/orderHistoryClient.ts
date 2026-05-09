import { supabase } from "./supabase";

type OrderHistoryOptions = {
  limit?: number;
  timeoutMs?: number;
};

type OrderHistoryResponse = {
  orders: any[];
  error?: string;
  timedOut?: boolean;
};

const AUTH_STORAGE_KEY = "theway-cafe-auth-token";

const timeout = (ms: number, message: string) =>
  new Promise<never>((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), ms);
  });

function getStoredAccessToken() {
  if (typeof window === "undefined") return null;

  try {
    const storedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedSession) return null;

    const parsed = JSON.parse(storedSession);
    return typeof parsed?.access_token === "string" ? parsed.access_token : null;
  } catch (error) {
    console.warn("Stored auth token read failed:", error);
    return null;
  }
}

export async function fetchOrderHistoryForCurrentUser(
  userId: string,
  options: OrderHistoryOptions = {}
): Promise<OrderHistoryResponse> {
  const timeoutMs = options.timeoutMs ?? 7000;
  const controller = new AbortController();
  const abortTimer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    let accessToken = getStoredAccessToken();
    let tokenSource: "stored" | "session" | null = accessToken ? "stored" : null;

    if (!accessToken) {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        timeout(Math.min(1500, timeoutMs), "세션 확인 시간이 초과되었습니다."),
      ]);
      accessToken = sessionResult.data.session?.access_token || null;
      tokenSource = accessToken ? "session" : null;
    }

    if (!accessToken) {
      return { orders: [], error: "로그인 세션을 확인하지 못했습니다." };
    }

    const params = new URLSearchParams({ userId });
    if (options.limit) params.set("limit", String(options.limit));

    const requestOrders = (token: string) =>
      fetch(`/api/orders/history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      });

    let response = await requestOrders(accessToken);

    if (response.status === 401 && tokenSource === "stored") {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        timeout(Math.min(1500, timeoutMs), "세션 확인 시간이 초과되었습니다."),
      ]);
      const refreshedToken = sessionResult.data.session?.access_token;
      if (refreshedToken && refreshedToken !== accessToken) {
        response = await requestOrders(refreshedToken);
      }
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return {
        orders: [],
        error: payload.error || "주문 내역을 불러오지 못했습니다.",
      };
    }

    const payload = await response.json();
    return { orders: payload.orders || [] };
  } catch (error) {
    const isAbort = error instanceof DOMException && error.name === "AbortError";
    const isTimeout = error instanceof Error && error.message.includes("초과");

    return {
      orders: [],
      timedOut: isAbort || isTimeout,
      error: isAbort || isTimeout
        ? "주문 내역 요청 시간이 초과되었습니다."
        : "주문 내역을 불러오지 못했습니다.",
    };
  } finally {
    window.clearTimeout(abortTimer);
  }
}
