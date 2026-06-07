import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "~/lib/supabase";

type DashboardPeriod = "today" | "week" | "month" | "all";

type DashboardRange = {
  start: string | null;
  end: string | null;
  label: string;
};

const VALID_PERIODS = new Set<DashboardPeriod>(["today", "week", "month", "all"]);

function getPeriod(value: string | null): DashboardPeriod {
  return VALID_PERIODS.has(value as DashboardPeriod) ? (value as DashboardPeriod) : "today";
}

function getKoreaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function kstDateToUtcIso(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0)).toISOString();
}

function formatKoreaDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDateKeyInKorea(dateValue: string) {
  const parts = getKoreaDateParts(new Date(dateValue));
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getDashboardRange(period: DashboardPeriod): DashboardRange {
  if (period === "all") {
    return { start: null, end: null, label: "전체 기간" };
  }

  const today = getKoreaDateParts();
  const todayStartUtc = new Date(kstDateToUtcIso(today.year, today.month, today.day));
  let startYear = today.year;
  let startMonth = today.month;
  let startDay = today.day;
  let endYear = today.year;
  let endMonth = today.month;
  let endDay = today.day + 1;

  if (period === "week") {
    const dayOfWeek = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      weekday: "short",
    }).format(new Date());
    const weekdayIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayOfWeek);
    const daysSinceMonday = weekdayIndex === 0 ? 6 : weekdayIndex - 1;
    const monday = new Date(todayStartUtc);
    monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
    const sundayEnd = new Date(monday);
    sundayEnd.setUTCDate(sundayEnd.getUTCDate() + 7);

    return {
      start: monday.toISOString(),
      end: sundayEnd.toISOString(),
      label: `${formatKoreaDate(monday)} ~ ${formatKoreaDate(new Date(sundayEnd.getTime() - 1))}`,
    };
  }

  if (period === "month") {
    startDay = 1;
    if (today.month === 12) {
      endYear = today.year + 1;
      endMonth = 1;
    } else {
      endMonth = today.month + 1;
    }
    endDay = 1;
  }

  const start = kstDateToUtcIso(startYear, startMonth, startDay);
  const end = kstDateToUtcIso(endYear, endMonth, endDay);

  return {
    start,
    end,
    label: `${formatKoreaDate(new Date(start))} ~ ${formatKoreaDate(new Date(new Date(end).getTime() - 1))}`,
  };
}

async function requireAdmin(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { error: json({ error: "인증 정보가 없습니다." }, { status: 401 }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !anonKey) {
    return { error: json({ error: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 500 }) };
  }

  const authSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authSupabase.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: json({ error: "로그인이 만료되었습니다." }, { status: 401 }) };
  }

  const { data: userData, error: roleError } = await authSupabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (roleError) {
    console.error("Dashboard role check failed:", roleError);
    return { error: json({ error: "관리자 권한 확인에 실패했습니다." }, { status: 500 }) };
  }

  if (userData?.role !== "admin" && userData?.role !== "staff") {
    return { error: json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }

  return { supabase: createServerSupabaseClient(), user: authData.user };
}

function sortByRevenueDesc<T extends { revenue: number }>(rows: T[]) {
  return rows.sort((a, b) => b.revenue - a.revenue);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const url = new URL(request.url);
  const period = getPeriod(url.searchParams.get("period"));
  const range = getDashboardRange(period);

  let query = admin.supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      church_group,
      total_amount,
      status,
      created_at,
      order_items (
        id,
        menu_id,
        quantity,
        total_price,
        menu:menus (id, name)
      )
    `)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  if (range.start) query = query.gte("created_at", range.start);
  if (range.end) query = query.lt("created_at", range.end);

  const { data: orders, error } = await query;

  if (error) {
    console.error("Dashboard orders fetch failed:", error);
    return json({ error: "대시보드 데이터를 불러오지 못했습니다." }, { status: 500 });
  }

  const byChurchGroup = new Map<string, { name: string; count: number; revenue: number }>();
  const byMenu = new Map<string, { menuId: string; name: string; quantity: number; revenue: number }>();
  const byDate = new Map<string, { date: string; count: number; revenue: number }>();
  let totalRevenue = 0;

  (orders || []).forEach((order: any) => {
    const orderRevenue = Number(order.total_amount || 0);
    const churchGroup = typeof order.church_group === "string" && order.church_group.trim()
      ? order.church_group.trim()
      : "미입력";
    const dateKey = getDateKeyInKorea(order.created_at);

    totalRevenue += orderRevenue;

    const groupRow = byChurchGroup.get(churchGroup) || { name: churchGroup, count: 0, revenue: 0 };
    groupRow.count += 1;
    groupRow.revenue += orderRevenue;
    byChurchGroup.set(churchGroup, groupRow);

    const dateRow = byDate.get(dateKey) || { date: dateKey, count: 0, revenue: 0 };
    dateRow.count += 1;
    dateRow.revenue += orderRevenue;
    byDate.set(dateKey, dateRow);

    order.order_items?.forEach((item: any) => {
      const menuId = String(item.menu_id || item.menu?.id || "unknown");
      const menuName = item.menu?.name || "메뉴명 없음";
      const quantity = Number(item.quantity || 0);
      const itemRevenue = Number(item.total_price || 0);
      const menuRow = byMenu.get(menuId) || { menuId, name: menuName, quantity: 0, revenue: 0 };
      menuRow.quantity += quantity;
      menuRow.revenue += itemRevenue;
      byMenu.set(menuId, menuRow);
    });
  });

  const totalOrders = orders?.length || 0;

  return json(
    {
      period,
      range,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      },
      byChurchGroup: sortByRevenueDesc(Array.from(byChurchGroup.values())),
      byMenu: sortByRevenueDesc(Array.from(byMenu.values())),
      byDate: Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date)),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
