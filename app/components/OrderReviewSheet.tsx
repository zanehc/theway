import type { Menu } from "~/types";
import type { ReactNode } from "react";

export type ItemOptions = {
  strength?: "light";
  water?: "more" | "less";
  ice?: "more" | "less";
};

export type ReviewCartItem = {
  menu: Menu;
  quantity: number;
  total_price: number;
  options?: ItemOptions[];
};

type Props = {
  cart: ReviewCartItem[];
  isOpen: boolean;
  isSubmitting: boolean;
  notes: string;
  customerName: string;
  churchGroup: string;
  onClose: () => void;
  onUpdateQuantity: (menuId: string, qty: number) => void;
  onUpdateOptions: (menuId: string, index: number, opts: ItemOptions) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  submittingLabel?: string;
};

const isCoffee = (category: string) => category === "ice coffee" || category === "hot coffee";

function OptionButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-xl border px-3 text-xs font-black transition-colors ${
        active
          ? "border-ink bg-ink text-white"
          : "border-hairline-soft bg-canvas text-body hover:border-ash"
      }`}
    >
      {children}
    </button>
  );
}

function LightToggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors ${
        checked ? "justify-end bg-blue-500" : "justify-start bg-stone"
      }`}
    >
      <span className="h-6 w-6 rounded-full bg-white shadow" />
    </button>
  );
}

export default function OrderReviewSheet({
  cart,
  isOpen,
  isSubmitting,
  notes,
  customerName,
  churchGroup,
  onClose,
  onUpdateQuantity,
  onUpdateOptions,
  onNotesChange,
  onSubmit,
  submitLabel,
  submittingLabel,
}: Props) {
  if (!isOpen) return null;

  const totalAmount = cart.reduce((sum, item) => sum + item.total_price, 0);

  const getCupOptions = (item: ReviewCartItem, index: number) => item.options?.[index] || {};

  const updateOption = (item: ReviewCartItem, index: number, next: ItemOptions) => {
    onUpdateOptions(item.menu.id, index, { ...getCupOptions(item, index), ...next });
  };

  const setWater = (item: ReviewCartItem, index: number, value?: "more" | "less") => {
    onUpdateOptions(item.menu.id, index, { ...getCupOptions(item, index), water: value });
  };

  const setIce = (item: ReviewCartItem, index: number, value?: "more" | "less") => {
    onUpdateOptions(item.menu.id, index, { ...getCupOptions(item, index), ice: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-xl font-black text-ink">주문 확인</h2>
            <p className="mt-0.5 text-xs font-bold text-mute">
              {customerName}{churchGroup ? ` · ${churchGroup}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="주문 확인 닫기"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-xl font-black text-mute hover:bg-secondary-bg hover:text-ink disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          <div className="mb-4 rounded-2xl bg-surface-soft p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-body">총 결제금액</span>
              <span className="text-lg font-black text-ink">₩{totalAmount.toLocaleString()}</span>
            </div>
            <div className="mt-3 rounded-2xl border border-primary/20 bg-canvas px-4 py-3">
              <div className="text-xs font-black text-primary">입금 계좌</div>
              <div className="mt-1 text-sm font-black text-ink">카카오뱅크 3333-29-6621229</div>
              <div className="mt-0.5 text-xs font-bold text-mute">예금주: Cafe 이음 (편도영)</div>
            </div>
          </div>

          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.menu.id} className="rounded-2xl border border-hairline-soft bg-canvas p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-black leading-tight text-ink">{item.menu.name}</h3>
                    <p className="mt-1 text-sm font-bold text-mute">
                      ₩{item.menu.price.toLocaleString()} · 소계 ₩{item.total_price.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-surface-soft p-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.menu.id, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-sm font-black text-body hover:bg-secondary-bg"
                      aria-label={`${item.menu.name} 수량 줄이기`}
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-black text-ink">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateQuantity(item.menu.id, item.quantity + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-sm font-black text-body hover:bg-secondary-bg"
                      aria-label={`${item.menu.name} 수량 늘리기`}
                    >
                      +
                    </button>
                  </div>
                </div>

                {isCoffee(item.menu.category) && (
                  <div className="mt-4 space-y-3">
                    {Array.from({ length: item.quantity }, (_, index) => {
                      const cupOptions = getCupOptions(item, index);
                      return (
                        <div key={`${item.menu.id}-${index}`} className="space-y-3 rounded-2xl bg-surface-soft p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-black text-ink">{index + 1}번 옵션</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-body">연하게</span>
                              <LightToggle
                                checked={cupOptions.strength === "light"}
                                onChange={() => updateOption(item, index, { strength: cupOptions.strength === "light" ? undefined : "light" })}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 text-sm font-black text-body">물</div>
                            <div className="grid grid-cols-3 gap-2">
                              <OptionButton active={!cupOptions.water} onClick={() => setWater(item, index, undefined)}>보통</OptionButton>
                              <OptionButton active={cupOptions.water === "more"} onClick={() => setWater(item, index, "more")}>많게</OptionButton>
                              <OptionButton active={cupOptions.water === "less"} onClick={() => setWater(item, index, "less")}>적게</OptionButton>
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 text-sm font-black text-body">얼음</div>
                            <div className="grid grid-cols-3 gap-2">
                              <OptionButton active={!cupOptions.ice} onClick={() => setIce(item, index, undefined)}>보통</OptionButton>
                              <OptionButton active={cupOptions.ice === "more"} onClick={() => setIce(item, index, "more")}>많게</OptionButton>
                              <OptionButton active={cupOptions.ice === "less"} onClick={() => setIce(item, index, "less")}>적게</OptionButton>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-black text-body">요청사항</label>
            <textarea
              value={notes}
              onChange={(event) => onNotesChange(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-hairline bg-surface-soft px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
              placeholder="전체 주문 요청사항"
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-hairline bg-white px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onSubmit}
            disabled={cart.length === 0 || isSubmitting}
            className="h-14 w-full rounded-2xl bg-primary text-base font-black text-white transition-colors hover:bg-primary-pressed disabled:cursor-not-allowed disabled:bg-surface-card disabled:text-ash"
          >
            {isSubmitting ? (submittingLabel || "주문 처리 중...") : (submitLabel || `₩${totalAmount.toLocaleString()} 주문하기`)}
          </button>
        </div>
      </div>
    </div>
  );
}
