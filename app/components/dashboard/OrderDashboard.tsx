import { useEffect, useMemo, useState } from "react";
import { supabase } from "~/lib/supabase";

type DashboardPeriod = "today" | "week" | "month" | "all";

type DashboardData = {
  period: DashboardPeriod;
  range: { start: string | null; end: string | null; label: string };
  generatedAt: string;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
  };
  byChurchGroup: Array<{ name: string; count: number; revenue: number }>;
  byMenu: Array<{ menuId: string; name: string; quantity: number; revenue: number }>;
  byDate: Array<{ date: string; count: number; revenue: number }>;
};

const PERIODS: Array<{ id: DashboardPeriod; label: string }> = [
  { id: "today", label: "오늘" },
  { id: "week", label: "이번주" },
  { id: "month", label: "이번달" },
  { id: "all", label: "전체" },
];

const money = (value: number) => `₩${Number(value || 0).toLocaleString()}`;

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function BarRow({
  label,
  meta,
  revenue,
  maxRevenue,
}: {
  label: string;
  meta: string;
  revenue: number;
  maxRevenue: number;
}) {
  const percent = maxRevenue > 0 ? Math.max(4, Math.round((revenue / maxRevenue) * 100)) : 0;

  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-ink">{label}</div>
          <div className="text-xs font-medium text-mute">{meta}</div>
        </div>
        <div className="shrink-0 text-sm font-black text-ink">{money(revenue)}</div>
      </div>
      <div className="h-2 rounded-full bg-surface-soft">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-hairline bg-surface-soft px-4 py-8 text-center text-sm font-medium text-mute">
      데이터가 없습니다.
    </div>
  );
}

export default function OrderDashboard({
  initialPeriod = "today",
  onPeriodChange,
}: {
  initialPeriod?: DashboardPeriod;
  onPeriodChange?: (period: DashboardPeriod) => void;
}) {
  const [period, setPeriod] = useState<DashboardPeriod>(initialPeriod);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const maxChurchRevenue = useMemo(
    () => Math.max(0, ...(data?.byChurchGroup || []).map((row) => row.revenue)),
    [data]
  );
  const maxMenuRevenue = useMemo(
    () => Math.max(0, ...(data?.byMenu || []).map((row) => row.revenue)),
    [data]
  );
  const maxDateRevenue = useMemo(
    () => Math.max(0, ...(data?.byDate || []).map((row) => row.revenue)),
    [data]
  );

  useEffect(() => {
    setPeriod(initialPeriod);
  }, [initialPeriod]);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const token = await getAccessToken();
        if (!token) throw new Error("로그인 세션을 확인하지 못했습니다.");

        const res = await fetch(`/api/orders/dashboard?period=${period}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || "대시보드 데이터를 불러오지 못했습니다.");

        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : "대시보드 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDashboard();
    return () => { cancelled = true; };
  }, [period, refreshKey]);

  useEffect(() => {
    const handleOrderNotification = () => {
      setRefreshKey((key) => key + 1);
    };

    window.addEventListener("theway:order-notification", handleOrderNotification);
    return () => window.removeEventListener("theway:order-notification", handleOrderNotification);
  }, []);

  const changePeriod = (nextPeriod: DashboardPeriod) => {
    setPeriod(nextPeriod);
    onPeriodChange?.(nextPeriod);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-hairline bg-canvas p-3">
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => changePeriod(item.id)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                period === item.id
                  ? "bg-primary text-white"
                  : "bg-surface-soft text-body hover:bg-surface-card"
              }`}
            >
              {item.label}
            </button>
          ))}
          {data?.range?.label && (
            <span className="ml-auto text-xs font-semibold text-mute">{data.range.label}</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-hairline bg-canvas px-4 py-12 text-center text-sm font-bold text-mute">
          대시보드를 불러오는 중...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-bold text-red-700">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-hairline bg-canvas p-4">
              <div className="text-xs font-bold text-mute">총 매출</div>
              <div className="mt-1 text-2xl font-black text-ink">{money(data.summary.totalRevenue)}</div>
            </div>
            <div className="rounded-2xl border border-hairline bg-canvas p-4">
              <div className="text-xs font-bold text-mute">총 주문</div>
              <div className="mt-1 text-2xl font-black text-ink">{data.summary.totalOrders.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-hairline bg-canvas p-4">
              <div className="text-xs font-bold text-mute">평균 주문액</div>
              <div className="mt-1 text-2xl font-black text-ink">{money(data.summary.avgOrderValue)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-hairline bg-canvas p-4">
              <h3 className="mb-3 text-sm font-black text-ink">목장별 판매</h3>
              {data.byChurchGroup.length > 0 ? (
                <div className="max-h-80 overflow-y-auto divide-y divide-hairline">
                  {data.byChurchGroup.map((row) => (
                    <BarRow
                      key={row.name}
                      label={row.name}
                      meta={`${row.count.toLocaleString()}건`}
                      revenue={row.revenue}
                      maxRevenue={maxChurchRevenue}
                    />
                  ))}
                </div>
              ) : <EmptyState />}
            </section>

            <section className="rounded-2xl border border-hairline bg-canvas p-4">
              <h3 className="mb-3 text-sm font-black text-ink">메뉴별 판매</h3>
              {data.byMenu.length > 0 ? (
                <div className="max-h-80 overflow-y-auto divide-y divide-hairline">
                  {data.byMenu.map((row) => (
                    <BarRow
                      key={row.menuId}
                      label={row.name}
                      meta={`${row.quantity.toLocaleString()}개`}
                      revenue={row.revenue}
                      maxRevenue={maxMenuRevenue}
                    />
                  ))}
                </div>
              ) : <EmptyState />}
            </section>
          </div>

          <section className="rounded-2xl border border-hairline bg-canvas p-4">
            <h3 className="mb-3 text-sm font-black text-ink">일자별 매출</h3>
            {data.byDate.length > 0 ? (
              <div className="divide-y divide-hairline">
                {data.byDate.map((row) => (
                  <BarRow
                    key={row.date}
                    label={row.date}
                    meta={`${row.count.toLocaleString()}건`}
                    revenue={row.revenue}
                    maxRevenue={maxDateRevenue}
                  />
                ))}
              </div>
            ) : <EmptyState />}
          </section>
        </>
      ) : null}
    </div>
  );
}
