import { useOutletContext, useNavigate } from "@remix-run/react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";
import { useNotifications } from "~/contexts/NotificationContext";

type CouponRow = {
  id: string;
  discount_percent: number;
  target_type: "user" | "group";
  target_user_id: string | null;
  target_church_group: string | null;
  description: string | null;
  is_active: boolean;
  used_at: string | null;
  created_at: string;
  target_user?: { id: string; name: string; email: string } | null;
  used_by_user?: { id: string; name: string } | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  church_group: string | null;
  role: string;
};

export default function AdminCouponsPage() {
  const { user } = useOutletContext<{ user: any; userRole: string | null }>();
  const navigate = useNavigate();
  const { addToast } = useNotifications();

  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [churchGroups, setChurchGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [targetType, setTargetType] = useState<"user" | "group">("group");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetChurchGroup, setTargetChurchGroup] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [description, setDescription] = useState("");

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchCoupons = useCallback(async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error("로그인 세션을 확인하지 못했습니다.");

    const res = await fetch("/api/coupons", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "쿠폰 조회에 실패했습니다.");
    return data;
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchCoupons();
      setCoupons(data.coupons || []);
      setUsers(data.users || []);
      setChurchGroups(data.churchGroups || []);
    } catch (e: any) {
      setLoadError(e?.message || "쿠폰을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [fetchCoupons]);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user, loadAll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("로그인 세션을 확인하지 못했습니다.");

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "createCoupon",
          targetType,
          targetUserId,
          targetChurchGroup,
          discountPercent,
          description,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "쿠폰 발급에 실패했습니다.");

      addToast("쿠폰을 발급했습니다.", "success");
      setDescription("");
      setTargetUserId("");
      setTargetChurchGroup("");
      await loadAll();
    } catch (e: any) {
      addToast(e?.message || "쿠폰 발급에 실패했습니다.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (couponId: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("로그인 세션을 확인하지 못했습니다.");
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ intent: "deactivateCoupon", couponId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "쿠폰 비활성화에 실패했습니다.");
      addToast("쿠폰을 비활성화했습니다.", "info");
      await loadAll();
    } catch (e: any) {
      addToast(e?.message || "쿠폰 비활성화에 실패했습니다.", "error");
    }
  };

  const targetLabel = (c: CouponRow) => {
    if (c.target_type === "user") {
      return c.target_user?.name
        ? `${c.target_user.name}님`
        : `회원 (${c.target_user_id?.slice(-6) || "?"})`;
    }
    return `${c.target_church_group} 목장`;
  };

  return (
    <div className="min-h-screen bg-canvas pb-20">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-ink">쿠폰 발급</h1>
          <button
            onClick={() => navigate("/other")}
            className="text-sm font-bold text-mute hover:text-ink"
          >
            닫기
          </button>
        </div>

        {/* 발급 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 space-y-4 mb-6">
          {/* 대상 유형 */}
          <div>
            <label className="block text-sm font-bold text-body mb-2">대상</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetType("group")}
                className={`py-2 rounded-xl font-bold text-sm transition-colors ${
                  targetType === "group"
                    ? "bg-primary text-white"
                    : "bg-surface-soft text-body"
                }`}
              >
                목장
              </button>
              <button
                type="button"
                onClick={() => setTargetType("user")}
                className={`py-2 rounded-xl font-bold text-sm transition-colors ${
                  targetType === "user"
                    ? "bg-primary text-white"
                    : "bg-surface-soft text-body"
                }`}
              >
                회원
              </button>
            </div>
          </div>

          {/* 대상 선택 */}
          {targetType === "group" ? (
            <div>
              <label className="block text-sm font-bold text-body mb-2">목장 선택</label>
              <input
                type="text"
                list="church-groups"
                value={targetChurchGroup}
                onChange={(e) => setTargetChurchGroup(e.target.value)}
                placeholder="예: 1목장, 청년부"
                className="w-full rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
              />
              <datalist id="church-groups">
                {churchGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-body mb-2">회원 선택</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
              >
                <option value="">회원을 선택하세요</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.church_group ? ` · ${u.church_group}` : ""}
                    {u.email ? ` (${u.email})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 할인율 */}
          <div>
            <label className="block text-sm font-bold text-body mb-2">
              할인율: <span className="text-primary">{discountPercent}%</span>
            </label>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-mute mt-1">
              <span>5%</span>
              <span>100% (무료)</span>
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-bold text-body mb-2">설명 (선택)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              placeholder="예: 목장 행사 감사 쿠폰"
              className="w-full rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white py-3 rounded-2xl font-bold hover:bg-primary-pressed transition-colors disabled:opacity-60"
          >
            {submitting ? "발급 중..." : "쿠폰 발급"}
          </button>
        </form>

        {/* 발급 목록 */}
        <h2 className="text-lg font-bold text-ink mb-3">발급된 쿠폰</h2>
        {loading ? (
          <p className="text-center text-mute py-6">불러오는 중...</p>
        ) : loadError ? (
          <p className="text-center text-red-600 py-6">{loadError}</p>
        ) : coupons.length === 0 ? (
          <p className="text-center text-mute py-6">발급된 쿠폰이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => (
              <div
                key={c.id}
                className={`bg-white rounded-2xl p-4 ${c.is_active ? "" : "opacity-60"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-ink">
                      {targetLabel(c)} ·{" "}
                      <span className="text-primary">{c.discount_percent}% 할인</span>
                    </p>
                    {c.description && (
                      <p className="text-xs text-mute mt-0.5">{c.description}</p>
                    )}
                    <p className="text-xs text-mute mt-1">
                      {c.is_active
                        ? "사용 가능"
                        : c.used_at
                        ? `사용됨${c.used_by_user?.name ? ` · ${c.used_by_user.name}님` : ""}`
                        : "비활성화"}
                    </p>
                  </div>
                  {c.is_active && (
                    <button
                      onClick={() => handleDeactivate(c.id)}
                      className="text-xs font-bold text-red-600 hover:text-red-700 whitespace-nowrap"
                    >
                      비활성화
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
