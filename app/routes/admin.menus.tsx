import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { createServerSupabaseClient, deleteMenuImage, supabase, uploadMenuImage } from "~/lib/supabase";
import type { Menu } from "~/types";

type ActionResponse = { error?: string; success?: boolean; message?: string };

const categories = [
  { id: "all", name: "전체" },
  { id: "hot coffee", name: "Hot 커피" },
  { id: "ice coffee", name: "Ice 커피" },
  { id: "tea", name: "차" },
  { id: "beverage", name: "ADE / 음료" },
];

const editCategories = categories.filter((category) => category.id !== "all");

function getActionErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const details = error as { code?: string; message?: string; details?: string; hint?: string };
    return [details.code, details.message, details.details, details.hint].filter(Boolean).join(" - ");
  }

  if (error instanceof Error) return error.message;
  return String(error || "알 수 없는 오류");
}

function getCategoryName(categoryId: string) {
  return categories.find((category) => category.id === categoryId)?.name || categoryId;
}

function MenuImage({ menu, className = "" }: { menu: Pick<Menu, "name" | "image_url">; className?: string }) {
  return (
    <div className={`overflow-hidden bg-surface-soft ${className}`}>
      {menu.image_url ? (
        <img src={menu.image_url} alt={menu.name} className="h-full w-full object-cover object-center" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-stone">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5V7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M3 15l4.5-4.5a1.5 1.5 0 012.12 0L12 12.88l1.38-1.38a1.5 1.5 0 012.12 0L21 17" />
          </svg>
        </div>
      )}
    </div>
  );
}

function ImagePicker({
  currentImageUrl,
  imagePreview,
  shouldRemoveImage,
  onImageChange,
  onRemoveImage,
  onUndoRemoveImage,
}: {
  currentImageUrl?: string | null;
  imagePreview: string | null;
  shouldRemoveImage: boolean;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onUndoRemoveImage: () => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-body">이미지</label>
      <div className="grid grid-cols-[88px_1fr] gap-3">
        <div className="h-[88px] w-[88px] overflow-hidden rounded-lg border border-hairline bg-surface-soft">
          {imagePreview ? (
            <img src={imagePreview} alt="새 이미지 미리보기" className="h-full w-full object-cover object-center" />
          ) : currentImageUrl && !shouldRemoveImage ? (
            <img src={currentImageUrl} alt="현재 이미지" className="h-full w-full object-cover object-center" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-mute">
              이미지 없음
            </div>
          )}
        </div>
        <div className="min-w-0">
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={onImageChange}
            className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm font-medium text-black file:mr-3 file:rounded-md file:border-0 file:bg-secondary-bg file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-body focus:outline-none focus:ring-2 focus:ring-focus-outer"
          />
          {currentImageUrl && !imagePreview && (
            <button
              type="button"
              onClick={shouldRemoveImage ? onUndoRemoveImage : onRemoveImage}
              className={`mt-2 text-sm font-bold ${shouldRemoveImage ? "text-primary" : "text-red-600"}`}
            >
              {shouldRemoveImage ? "이미지 삭제 취소" : "현재 이미지 삭제"}
            </button>
          )}
          {shouldRemoveImage && (
            <p className="mt-1 text-xs font-bold text-red-600">저장하면 현재 이미지가 삭제됩니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuFormModal({
  mode,
  menu,
  fetcher,
  imagePreview,
  shouldRemoveImage,
  onClose,
  onImageChange,
  onRemoveImage,
  onUndoRemoveImage,
}: {
  mode: "create" | "edit";
  menu?: Menu | null;
  fetcher: ReturnType<typeof useFetcher<ActionResponse>>;
  imagePreview: string | null;
  shouldRemoveImage: boolean;
  onClose: () => void;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onUndoRemoveImage: () => void;
}) {
  const isSubmitting = fetcher.state !== "idle";
  const isEdit = mode === "edit" && menu;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-ink">{isEdit ? "메뉴 수정" : "새 메뉴 추가"}</h2>
            <p className="mt-1 text-sm font-medium text-mute">
              이름, 가격, 카테고리, 판매 상태를 한 번에 관리할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-bg text-body hover:bg-hairline"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <fetcher.Form method="post" action="/admin/menus" encType="multipart/form-data" className="space-y-4">
          <input type="hidden" name="intent" value={isEdit ? "updateMenu" : "createMenu"} />
          {isEdit && <input type="hidden" name="id" value={menu.id} />}
          <input type="hidden" name="removeImage" value={shouldRemoveImage ? "true" : "false"} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-bold text-body">메뉴명 *</label>
              <input
                type="text"
                name="name"
                defaultValue={menu?.name || ""}
                required
                placeholder="예: 아이스 아메리카노"
                className="w-full rounded-lg border border-hairline bg-white px-4 py-3 text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-focus-outer"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-body">가격 *</label>
              <input
                type="number"
                name="price"
                defaultValue={menu?.price ?? ""}
                required
                min="0"
                step="100"
                placeholder="3000"
                className="w-full rounded-lg border border-hairline bg-white px-4 py-3 text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-focus-outer"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-body">카테고리 *</label>
              <select
                name="category"
                defaultValue={menu?.category || ""}
                required
                className="w-full rounded-lg border border-hairline bg-white px-4 py-3 text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-focus-outer"
              >
                <option value="">카테고리 선택</option>
                {editCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-body">설명</label>
            <textarea
              name="description"
              defaultValue={menu?.description || ""}
              rows={3}
              placeholder="주문 화면에 보여줄 간단한 설명"
              className="w-full resize-none rounded-lg border border-hairline bg-white px-4 py-3 text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-focus-outer"
            />
          </div>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-hairline bg-surface-soft px-4 py-3">
            <span>
              <span className="block text-sm font-bold text-body">판매 중</span>
              <span className="block text-xs font-medium text-mute">끄면 주문 화면에서 숨겨집니다.</span>
            </span>
            <input
              type="checkbox"
              name="isAvailable"
              value="true"
              defaultChecked={menu?.is_available ?? true}
              className="h-5 w-5 accent-primary"
            />
          </label>

          <ImagePicker
            currentImageUrl={menu?.image_url}
            imagePreview={imagePreview}
            shouldRemoveImage={shouldRemoveImage}
            onImageChange={onImageChange}
            onRemoveImage={onRemoveImage}
            onUndoRemoveImage={onUndoRemoveImage}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-secondary-bg px-4 py-3 font-bold text-body transition-colors hover:bg-hairline"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-primary px-4 py-3 font-bold text-white transition-colors hover:bg-primary-pressed disabled:opacity-50"
            >
              {isSubmitting ? "저장 중..." : isEdit ? "수정 저장" : "메뉴 추가"}
            </button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}

export async function loader(_args: LoaderFunctionArgs) {
  try {
    const { data: menus, error } = await supabase
      .from("menus")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;
    return json({ menus: (menus || []) as Menu[], error: null });
  } catch (error) {
    console.error("Menus loader error:", error);
    return json({ menus: [] as Menu[], error: "메뉴 목록을 불러오지 못했습니다." });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  let formData: FormData;
  let intent: string;

  try {
    formData = await request.formData();
    intent = String(formData.get("intent") || "");
  } catch (error) {
    console.error("Menu action form error:", error);
    return json({ error: "요청을 읽는 중 오류가 발생했습니다." }, { status: 500 });
  }

  const serverSupabase = createServerSupabaseClient();

  if (intent === "createMenu" || intent === "updateMenu") {
    try {
      const id = String(formData.get("id") || "");
      const name = String(formData.get("name") || "").trim();
      const description = String(formData.get("description") || "").trim();
      const price = Number.parseInt(String(formData.get("price") || ""), 10);
      const category = String(formData.get("category") || "");
      const imageFile = formData.get("image") as File | null;
      const removeImage = formData.get("removeImage") === "true";
      const hasUploadedImage = imageFile instanceof File && imageFile.size > 0;
      const isAvailable = formData.get("isAvailable") === "true";

      if (!name || Number.isNaN(price) || price < 0 || !category) {
        return json({ error: "메뉴명, 가격, 카테고리를 확인해주세요." }, { status: 400 });
      }

      if (hasUploadedImage && !imageFile.type.startsWith("image/")) {
        return json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
      }

      if (hasUploadedImage && imageFile.size > 5 * 1024 * 1024) {
        return json({ error: "이미지 파일은 5MB 이하여야 합니다." }, { status: 400 });
      }

      const menuData = {
        name,
        description: description || null,
        price,
        category,
        is_available: isAvailable,
      };

      let menuId = id;
      let existingImageUrl: string | null = null;

      if (intent === "createMenu") {
        const { data: menu, error } = await serverSupabase
          .from("menus")
          .insert({ ...menuData, image_url: null })
          .select("id")
          .single();

        if (error) throw error;
        menuId = menu.id;
      } else {
        if (!menuId) return json({ error: "수정할 메뉴를 찾지 못했습니다." }, { status: 400 });

        const { data: existingMenu, error: fetchError } = await serverSupabase
          .from("menus")
          .select("image_url")
          .eq("id", menuId)
          .single();

        if (fetchError) throw fetchError;
        existingImageUrl = existingMenu?.image_url || null;
      }

      const updateData: Record<string, unknown> = menuData;

      if (hasUploadedImage) {
        const imageUrl = await uploadMenuImage(imageFile, menuId);
        if (!imageUrl) return json({ error: "이미지 업로드에 실패했습니다." }, { status: 400 });

        if (existingImageUrl) await deleteMenuImage(existingImageUrl);
        updateData.image_url = imageUrl;
      } else if (intent === "updateMenu" && removeImage) {
        if (existingImageUrl) await deleteMenuImage(existingImageUrl);
        updateData.image_url = null;
      }

      const { error: updateError } = await serverSupabase
        .from("menus")
        .update(updateData)
        .eq("id", menuId);

      if (updateError) throw updateError;

      return json({
        success: true,
        message: intent === "createMenu" ? "메뉴가 추가되었습니다." : "메뉴가 수정되었습니다.",
      });
    } catch (error) {
      console.error("Save menu error:", error);
      return json({ error: `메뉴 저장에 실패했습니다. (${getActionErrorMessage(error)})` }, { status: 400 });
    }
  }

  if (intent === "deleteMenu") {
    try {
      const id = String(formData.get("id") || "");
      const imageUrl = String(formData.get("imageUrl") || "");

      if (!id) return json({ error: "삭제할 메뉴를 찾지 못했습니다." }, { status: 400 });
      if (imageUrl) await deleteMenuImage(imageUrl);

      const { error } = await serverSupabase.from("menus").delete().eq("id", id);
      if (error) throw error;

      return json({ success: true, message: "메뉴가 삭제되었습니다." });
    } catch (error) {
      console.error("Delete menu error:", error);
      return json({ error: `메뉴 삭제에 실패했습니다. (${getActionErrorMessage(error)})` }, { status: 400 });
    }
  }

  return json({ error: "잘못된 요청입니다." }, { status: 400 });
}

export default function Menus() {
  const { menus, error } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionResponse>();
  const deleteFetcher = useFetcher<ActionResponse>();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [deletingMenu, setDeletingMenu] = useState<Menu | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const actionData = fetcher.data;
  const deleteActionData = deleteFetcher.data;

  useEffect(() => {
    if (fetcher.state !== "idle" || !actionData) return;

    if (actionData.error) {
      setNotice(actionData.error);
      return;
    }

    if (actionData.success) {
      setNotice(actionData.message || "저장되었습니다.");
      closeModal();
    }
  }, [actionData, fetcher.state]);

  useEffect(() => {
    if (deleteFetcher.state !== "idle" || !deleteActionData) return;

    if (deleteActionData.error) {
      setNotice(deleteActionData.error);
      return;
    }

    if (deleteActionData.success) {
      setNotice(deleteActionData.message || "삭제되었습니다.");
      setDeletingMenu(null);
    }
  }, [deleteActionData, deleteFetcher.state]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const filteredMenus = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return menus.filter((menu) => {
      const matchesCategory = activeCategory === "all" || menu.category === activeCategory;
      const matchesSearch =
        !normalizedQuery ||
        menu.name.toLowerCase().includes(normalizedQuery) ||
        (menu.description || "").toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, menus, searchQuery]);

  const categoryCounts = useMemo(() => {
    return categories.reduce<Record<string, number>>((acc, category) => {
      acc[category.id] = category.id === "all"
        ? menus.length
        : menus.filter((menu) => menu.category === category.id).length;
      return acc;
    }, {});
  }, [menus]);

  const availableCount = menus.filter((menu) => menu.is_available).length;

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingMenu(null);
    setImagePreview(null);
    setShouldRemoveImage(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImagePreview(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setNotice("이미지 파일은 5MB 이하여야 합니다.");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setNotice("이미지 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
      setShouldRemoveImage(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-surface-soft pb-24">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-primary">관리자</p>
            <h1 className="mt-1 text-3xl font-black text-ink sm:text-4xl">메뉴 관리</h1>
            <p className="mt-2 text-sm font-medium text-mute">
              총 {menus.length}개 메뉴 중 {availableCount}개가 주문 화면에 표시됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateModal(true);
              setImagePreview(null);
              setShouldRemoveImage(false);
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-bold text-white transition-colors hover:bg-primary-pressed"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14M5 12h14" />
            </svg>
            새 메뉴
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-mute" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="메뉴명 또는 설명으로 검색"
              className="h-12 w-full rounded-lg border border-hairline bg-white pl-11 pr-4 text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-focus-outer"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`h-11 shrink-0 rounded-lg px-4 text-sm font-bold transition-colors ${
                  activeCategory === category.id
                    ? "bg-ink text-white"
                    : "border border-hairline bg-white text-body hover:bg-secondary-bg"
                }`}
              >
                {category.name}
                <span className={activeCategory === category.id ? "ml-2 text-white/70" : "ml-2 text-mute"}>
                  {categoryCounts[category.id] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        {filteredMenus.length === 0 ? (
          <div className="rounded-lg border border-dashed border-hairline bg-white px-6 py-14 text-center">
            <p className="text-lg font-black text-ink">표시할 메뉴가 없습니다.</p>
            <p className="mt-2 text-sm font-medium text-mute">검색어 또는 카테고리 필터를 조정해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMenus.map((menu) => (
              <article key={menu.id} className="rounded-lg border border-hairline bg-white p-3">
                <div className="grid grid-cols-[96px_1fr] gap-3">
                  <MenuImage menu={menu} className="h-24 w-24 rounded-lg" />
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black text-ink">{menu.name}</h2>
                        <p className="mt-1 text-sm font-bold text-primary">₩{menu.price.toLocaleString()}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${
                        menu.is_available ? "bg-green-100 text-green-700" : "bg-secondary-bg text-mute"
                      }`}>
                        {menu.is_available ? "판매중" : "숨김"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 min-h-[40px] text-sm font-medium leading-5 text-mute">
                      {menu.description || "설명 없음"}
                    </p>
                    <p className="mt-2 text-xs font-bold text-body">{getCategoryName(menu.category)}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMenu(menu);
                      setImagePreview(null);
                      setShouldRemoveImage(false);
                    }}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-secondary-bg text-sm font-bold text-body transition-colors hover:bg-hairline"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.86 4.49l1.65 1.65a2 2 0 010 2.83L9.5 17.97 5 19l1.03-4.5 9.01-9.01a2 2 0 012.82 0z" />
                    </svg>
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingMenu(menu)}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-50 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M10 11v6M14 11v6M9 7l1-2h4l1 2M8 7l1 14h6l1-14" />
                    </svg>
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {(showCreateModal || editingMenu) && (
          <MenuFormModal
            mode={editingMenu ? "edit" : "create"}
            menu={editingMenu}
            fetcher={fetcher}
            imagePreview={imagePreview}
            shouldRemoveImage={shouldRemoveImage}
            onClose={closeModal}
            onImageChange={handleImageChange}
            onRemoveImage={() => {
              setShouldRemoveImage(true);
              setImagePreview(null);
            }}
            onUndoRemoveImage={() => setShouldRemoveImage(false)}
          />
        )}

        {deletingMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-black text-ink">메뉴 삭제</h2>
              <p className="mt-2 text-sm font-medium text-mute">
                {deletingMenu.name} 메뉴를 삭제할까요? 삭제한 메뉴는 주문 화면에서도 사라집니다.
              </p>
              <deleteFetcher.Form method="post" action="/admin/menus" className="mt-5 flex gap-3">
                <input type="hidden" name="intent" value="deleteMenu" />
                <input type="hidden" name="id" value={deletingMenu.id} />
                <input type="hidden" name="imageUrl" value={deletingMenu.image_url || ""} />
                <button
                  type="button"
                  onClick={() => setDeletingMenu(null)}
                  className="flex-1 rounded-lg bg-secondary-bg px-4 py-3 font-bold text-body hover:bg-hairline"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={deleteFetcher.state !== "idle"}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteFetcher.state !== "idle" ? "삭제 중..." : "삭제"}
                </button>
              </deleteFetcher.Form>
            </div>
          </div>
        )}

        {notice && (
          <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg bg-ink px-4 py-3 text-center text-sm font-bold text-white shadow-2xl">
            {notice}
          </div>
        )}
      </main>
    </div>
  );
}
