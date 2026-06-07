import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id?: string | null;
  menu_id?: string | null;
  quantity?: number | null;
  notes?: string | null;
  menu?: {
    id?: string | null;
    name?: string | null;
  } | null;
};

type GroupedOrderItem = {
  key: string;
  name: string;
  quantity: number;
  notes: string;
};

function normalizeNotes(notes?: string | null) {
  return typeof notes === "string" ? notes.trim() : "";
}

function groupOrderItems(items: OrderItem[]) {
  const grouped = new Map<string, GroupedOrderItem>();

  items.forEach((item, index) => {
    const menuId = item.menu_id || item.menu?.id || "";
    const name = item.menu?.name || "메뉴명 없음";
    const notes = normalizeNotes(item.notes);
    const key = `${menuId || name}::${name}::${notes}`;
    const quantity = Math.max(0, Number(item.quantity || 0));
    const existing = grouped.get(key);

    if (existing) {
      existing.quantity += quantity;
      return;
    }

    grouped.set(key, {
      key: key || `menu-${index}`,
      name,
      quantity,
      notes,
    });
  });

  return Array.from(grouped.values());
}

const STORAGE_KEY_PREFIX = "order-item-badge-selections";

function getStorageKey(orderId?: string | null) {
  return `${STORAGE_KEY_PREFIX}:${orderId || "shared"}`;
}

function readStoredKeys(storageKey: string) {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return new Set(Array.isArray(parsedValue) ? parsedValue.filter((value) => typeof value === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeStoredKeys(storageKey: string, keys: Set<string>) {
  if (typeof window === "undefined") return;

  try {
    const values = Array.from(keys);
    if (values.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(values));
  } catch {
    // localStorage can be unavailable in private browsing or strict browser settings.
  }
}

export default function OrderItemBadges({ items, orderId }: { items?: OrderItem[]; orderId?: string | null }) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const groupedItems = useMemo(() => groupOrderItems(items || []), [items]);
  const storageKey = useMemo(() => getStorageKey(orderId), [orderId]);

  useEffect(() => {
    const validKeys = new Set(groupedItems.map((item) => item.key));
    const storedKeys = readStoredKeys(storageKey);
    const nextKeys = new Set(Array.from(storedKeys).filter((key) => validKeys.has(key)));
    setSelectedKeys(nextKeys);
  }, [groupedItems, storageKey]);

  if (groupedItems.length === 0) {
    return <span className="text-sm font-bold text-mute">메뉴 없음</span>;
  }

  const toggleSelected = (key: string) => {
    setSelectedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      writeStoredKeys(storageKey, next);
      return next;
    });
  };

  return (
    <div className="flex flex-wrap justify-start gap-2 sm:justify-center">
      {groupedItems.map((item) => {
        const isSelected = selectedKeys.has(item.key);

        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={isSelected}
            onClick={() => toggleSelected(item.key)}
            className={`inline-flex max-w-full flex-col rounded-2xl border px-3 py-1.5 text-left text-sm font-black leading-tight shadow-sm transition-colors sm:text-[15px] ${
              isSelected
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-primary/20 bg-primary/10 text-ink hover:border-primary/40 hover:bg-primary/15"
            }`}
          >
            <span className="inline-flex max-w-full items-center gap-1.5">
              <span className="truncate">{item.name}</span>
              <span className={`shrink-0 ${isSelected ? "text-white" : "text-primary"}`}>
                x {item.quantity}
              </span>
            </span>
            {item.notes && (
              <span
                className={`mt-0.5 max-w-full truncate text-[11px] font-bold ${
                  isSelected ? "text-blue-50" : "text-mute"
                }`}
              >
                {item.notes}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
