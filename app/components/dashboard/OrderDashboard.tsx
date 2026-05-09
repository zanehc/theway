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
const compactMoney = (value: number) => {
  const safeValue = Number(value || 0);
  if (safeValue >= 10000) return `₩${Math.round(safeValue / 10000).toLocaleString()}만`;
  return money(safeValue);
};

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function SummaryCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "revenue" | "orders";
}) {
  const toneClass = {
    default: "bg-canvas",
    revenue: "bg-[#fff8ef]",
    orders: "bg-[#f3faf7]",
  }[tone];

  return (
    <div className={`rounded-2xl border border-hairline p-4 ${toneClass}`}>
      <div className="text-xs font-black uppercase tracking-wide text-mute">{label}</div>
      <div className="mt-2 text-2xl font-black leading-none text-ink sm:text-3xl">{value}</div>
      <div className="mt-2 text-xs font-bold text-mute">{detail}</div>
    </div>
  );
}

function RankingRow({
  index,
  label,
  meta,
  revenue,
  maxRevenue,
}: {
  index: number;
  label: string;
  meta: string;
  revenue: number;
  maxRevenue: number;
}) {
  const percent = maxRevenue > 0 ? Math.max(6, Math.round((revenue / maxRevenue) * 100)) : 0;

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-xs font-black text-body">
            {index}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-ink">{label}</div>
            <div className="text-xs font-medium text-mute">{meta}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-sm font-black text-ink">{money(revenue)}</div>
          <div className="text-[11px] font-bold text-mute">{percent}%</div>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-soft">
        <div className="h-2.5 rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function DateTrendChart({
  rows,
}: {
  rows: Array<{ date: string; count: number; revenue: number }>;
}) {
  const maxRevenue = Math.max(0, ...rows.map((row) => row.revenue));
  const chartRows = rows.slice(-14);

  if (chartRows.length === 0) return <EmptyState />;

  return (
    <div>
      <div className="flex h-48 items-end gap-2 rounded-2xl bg-surface-soft px-3 pb-3 pt-5 sm:gap-3 sm:px-5">
        {chartRows.map((row) => {
          const height = maxRevenue > 0 ? Math.max(8, Math.round((row.revenue / maxRevenue) * 100)) : 0;
          const day = row.date.slice(5).replace("-", ".");
          return (
            <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end">
                <div
                  className="w-full rounded-t-xl bg-primary transition-all"
                  style={{ height: `${height}%` }}
                  title={`${row.date} ${money(row.revenue)}`}
                />
              </div>
              <div className="w-full truncate text-center text-[10px] font-bold text-mute">{day}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {chartRows.slice(-3).reverse().map((row) => (
          <div key={row.date} className="rounded-xl border border-hairline bg-canvas px-3 py-2">
            <div className="text-xs font-bold text-mute">{row.date}</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-sm font-black text-ink">{money(row.revenue)}</span>
              <span className="text-xs font-bold text-body">{row.count}건</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopHighlight({
  title,
  name,
  value,
  helper,
}: {
  title: string;
  name: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-canvas p-4">
      <div className="text-xs font-black text-mute">{title}</div>
      <div className="mt-2 truncate text-lg font-black text-ink">{name}</div>
      <div className="mt-1 text-sm font-bold text-primary">{value}</div>
      <div className="mt-3 text-xs font-medium leading-relaxed text-mute">{helper}</div>
    </div>
  );
}

function RankingList({
  title,
  subtitle,
  rows,
  maxRevenue,
  getKey,
  getLabel,
  getMeta,
}: {
  title: string;
  subtitle: string;
  rows: any[];
  maxRevenue: number;
  getKey: (row: any) => string;
  getLabel: (row: any) => string;
  getMeta: (row: any) => string;
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-canvas p-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <div className="truncate text-sm font-bold text-ink">{title}</div>
          <div className="text-xs font-medium text-mute">{subtitle}</div>
        </div>
        <div className="text-xs font-black text-mute">{rows.length}개</div>
      </div>

      {rows.length > 0 ? (
        <div className="max-h-96 overflow-y-auto divide-y divide-hairline">
          {rows.map((row, index) => (
            <RankingRow
              key={getKey(row)}
              index={index + 1}
              label={getLabel(row)}
              meta={getMeta(row)}
              revenue={row.revenue}
              maxRevenue={maxRevenue}
            />
          ))}
        </div>
      ) : <EmptyState />}
    </section>
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
  const topMenu = data?.byMenu?.[0];
  const topChurchGroup = data?.byChurchGroup?.[0];
  const latestDate = data?.byDate?.[data.byDate.length - 1];

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
    <div className="space-y-5">
      <div className="rounded-2xl border border-hairline bg-canvas p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-ink">매출 대시보드</h2>
            <p className="mt-1 text-sm font-medium text-mute">결제완료 주문 기준으로 집계됩니다.</p>
          </div>
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
          </div>
        </div>
        {data?.range?.label && (
          <div className="mt-3 rounded-xl bg-surface-soft px-3 py-2 text-xs font-bold text-mute">
            집계 기간: {data.range.label}
          </div>
        )}
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
            <SummaryCard
              label="총 매출"
              value={money(data.summary.totalRevenue)}
              detail={latestDate ? `최근 집계 ${latestDate.date}` : "선택 기간 누적"}
              tone="revenue"
            />
            <SummaryCard
              label="총 주문"
              value={`${data.summary.totalOrders.toLocaleString()}건`}
              detail="취소 주문 제외"
              tone="orders"
            />
            <SummaryCard
              label="평균 주문액"
              value={money(data.summary.avgOrderValue)}
              detail="주문 1건당 평균"
            />
          </div>

          {(topMenu || topChurchGroup) && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {topMenu && (
                <TopHighlight
                  title="가장 많이 팔린 메뉴"
                  name={topMenu.name}
                  value={`${topMenu.quantity.toLocaleString()}개 · ${compactMoney(topMenu.revenue)}`}
                  helper="메뉴별 판매량과 매출을 함께 봅니다."
                />
              )}
              {topChurchGroup && (
                <TopHighlight
                  title="주문이 가장 많은 목장"
                  name={topChurchGroup.name}
                  value={`${topChurchGroup.count.toLocaleString()}건 · ${compactMoney(topChurchGroup.revenue)}`}
                  helper="목장별 주문 참여도를 빠르게 확인합니다."
                />
              )}
            </div>
          )}

          <section className="rounded-2xl border border-hairline bg-canvas p-4">
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-base font-black text-ink">일자별 매출 흐름</h3>
                <p className="text-xs font-medium text-mute">최근 14개 날짜까지 막대 차트로 표시합니다.</p>
              </div>
              <div className="text-xs font-black text-mute">최고 {money(maxDateRevenue)}</div>
            </div>
            <DateTrendChart rows={data.byDate} />
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankingList
              title="메뉴별 판매"
              subtitle="매출 높은 순"
              rows={data.byMenu}
              maxRevenue={maxMenuRevenue}
              getKey={(row) => row.menuId}
              getLabel={(row) => row.name}
              getMeta={(row) => `${row.quantity.toLocaleString()}개 판매`}
            />
            <RankingList
              title="목장별 판매"
              subtitle="매출 높은 순"
              rows={data.byChurchGroup}
              maxRevenue={maxChurchRevenue}
              getKey={(row) => row.name}
              getLabel={(row) => row.name}
              getMeta={(row) => `${row.count.toLocaleString()}건 주문`}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
