import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { uploadMenuImage, deleteMenuImage } from "~/lib/supabase";
import Header from "~/components/Header";
import type { Menu } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { data: menus, error } = await supabase
      .from('menus')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    return json({ menus: menus || [] });
  } catch (error) {
    console.error('Menus loader error:', error);
    return json({ menus: [] });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'createMenu') {
    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const price = parseInt(formData.get('price') as string);
      const category = formData.get('category') as string;
      const imageFile = formData.get('image') as File | null;

      if (!name || !price || !category) {
        return json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
      }

      // 메뉴 생성
      const { data: menu, error: menuError } = await supabase
        .from('menus')
        .insert({
          name,
          description: description || null,
          price,
          category,
          image_url: null
        })
        .select()
        .single();

      if (menuError) throw menuError;

      // 이미지 업로드
      let imageUrl = null;
      if (imageFile && imageFile.size > 0) {
        imageUrl = await uploadMenuImage(imageFile, menu.id);
        
        if (imageUrl) {
          await supabase
            .from('menus')
            .update({ image_url: imageUrl })
            .eq('id', menu.id);
        }
      }

      return redirect('/menus');
    } catch (error) {
      console.error('Create menu error:', error);
      return json({ error: '메뉴 생성에 실패했습니다.' }, { status: 400 });
    }
  }

  if (intent === 'updateMenu') {
    try {
      const id = formData.get('id') as string;
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const price = parseInt(formData.get('price') as string);
      const category = formData.get('category') as string;
      const imageFile = formData.get('image') as File | null;

      if (!id || !name || !price || !category) {
        return json({ error: '필수 필드를 입력해주세요.' }, { status: 400 });
      }

      const updateData: any = {
        name,
        description: description || null,
        price,
        category
      };

      // 이미지 업로드
      if (imageFile && imageFile.size > 0) {
        const imageUrl = await uploadMenuImage(imageFile, id);
        if (imageUrl) {
          updateData.image_url = imageUrl;
        }
      }

      const { error } = await supabase
        .from('menus')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      return redirect('/menus');
    } catch (error) {
      console.error('Update menu error:', error);
      return json({ error: '메뉴 수정에 실패했습니다.' }, { status: 400 });
    }
  }

  if (intent === 'deleteMenu') {
    try {
      const id = formData.get('id') as string;
      const imageUrl = formData.get('imageUrl') as string;

      // 이미지 삭제
      if (imageUrl) {
        await deleteMenuImage(imageUrl);
      }

      // 메뉴 삭제
      const { error } = await supabase
        .from('menus')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return redirect('/menus');
    } catch (error) {
      console.error('Delete menu error:', error);
      return json({ error: '메뉴 삭제에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

export default function Menus() {
  const { menus } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // 에러 메시지 표시
  useEffect(() => {
    const actionData = fetcher.data as { error?: string } | undefined;
    if (actionData?.error) {
      alert(actionData.error);
    }
  }, [fetcher.data]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (selectedImage) {
      formData.set('image', selectedImage);
    }

    fetcher.submit(formData, { method: 'post' });
  };

  const categories = [
    { id: 'hot coffee', name: 'Hot 커피' },
    { id: 'ice coffee', name: 'Ice 커피' },
    { id: 'tea', name: '차' },
    { id: 'beverage', name: '음료' }
  ];

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-12">
        <div className="mb-8 sm:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl font-black text-wine-800 mb-2 sm:mb-4 tracking-tight">메뉴 관리</h1>
          <p className="text-lg sm:text-2xl text-wine-600 font-medium">카페 메뉴를 관리하세요</p>
        </div>

        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-wine text-ivory-50 px-6 py-3 rounded-xl font-bold hover:shadow-wine transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
          >
            새 메뉴 추가
          </button>
        </div>

        {/* 메뉴 목록 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {menus.map((menu) => (
            <div key={menu.id} className="bg-gradient-ivory rounded-xl shadow-soft p-4 sm:p-6 border border-ivory-200/50">
              <div className="h-32 sm:h-40 overflow-hidden bg-gradient-to-br from-ivory-100 to-ivory-200 rounded-lg mb-4 flex items-center justify-center">
                {menu.image_url ? (
                  <img 
                    src={menu.image_url} 
                    alt={menu.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>
              
              <h3 className="text-lg sm:text-xl font-bold text-wine-800 mb-2">{menu.name}</h3>
              {menu.description && (
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{menu.description}</p>
              )}
              <div className="flex justify-between items-center mb-3">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  menu.category === 'hot coffee' ? 'bg-red-100 text-red-800' :
                  menu.category === 'ice coffee' ? 'bg-blue-100 text-blue-800' :
                  menu.category === 'tea' ? 'bg-orange-100 text-orange-800' :
                  menu.category === 'beverage' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {menu.category === 'hot coffee' ? 'Hot 커피' :
                   menu.category === 'ice coffee' ? 'Ice 커피' :
                   menu.category === 'tea' ? '차' :
                   menu.category === 'beverage' ? '음료' : menu.category}
                </span>
                <span className="text-lg font-bold text-wine-700">₩{menu.price.toLocaleString()}</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingMenu(menu)}
                  className="flex-1 bg-wine-100 text-wine-700 py-2 px-3 rounded-lg font-bold hover:bg-wine-200 transition-colors text-sm"
                >
                  수정
                </button>
                <fetcher.Form method="post" className="flex-1">
                  <input type="hidden" name="intent" value="deleteMenu" />
                  <input type="hidden" name="id" value={menu.id} />
                  <input type="hidden" name="imageUrl" value={menu.image_url || ''} />
                  <button
                    type="submit"
                    onClick={(e) => {
                      if (!confirm('정말 삭제하시겠습니까?')) {
                        e.preventDefault();
                      }
                    }}
                    className="w-full bg-red-100 text-red-700 py-2 px-3 rounded-lg font-bold hover:bg-red-200 transition-colors text-sm"
                  >
                    삭제
                  </button>
                </fetcher.Form>
              </div>
            </div>
          ))}
        </div>

        {/* 새 메뉴 추가 모달 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black text-wine-800 mb-6">새 메뉴 추가</h2>
              
              <fetcher.Form method="post" onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="intent" value="createMenu" />
                
                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">메뉴명 *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">설명</label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">가격 *</label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">카테고리 *</label>
                  <select
                    name="category"
                    required
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500"
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">이미지</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={fetcher.state === 'submitting'}
                    className="flex-1 bg-gradient-wine text-ivory-50 py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 disabled:opacity-50"
                  >
                    {fetcher.state === 'submitting' ? '추가 중...' : '추가'}
                  </button>
                </div>
              </fetcher.Form>
            </div>
          </div>
        )}

        {/* 메뉴 수정 모달 */}
        {editingMenu && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black text-wine-800 mb-6">메뉴 수정</h2>
              
              <fetcher.Form method="post" onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="intent" value="updateMenu" />
                <input type="hidden" name="id" value={editingMenu.id} />
                
                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">메뉴명 *</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={editingMenu.name}
                    required
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">설명</label>
                  <textarea
                    name="description"
                    defaultValue={editingMenu.description || ''}
                    rows={3}
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">가격 *</label>
                  <input
                    type="number"
                    name="price"
                    defaultValue={editingMenu.price}
                    required
                    min="0"
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">카테고리 *</label>
                  <select
                    name="category"
                    defaultValue={editingMenu.category}
                    required
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-wine-700 mb-2">이미지</label>
                  {editingMenu.image_url && (
                    <div className="mb-2">
                      <img src={editingMenu.image_url} alt="Current" className="w-20 h-20 object-cover rounded-lg" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-base font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMenu(null);
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-bold hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={fetcher.state === 'submitting'}
                    className="flex-1 bg-gradient-wine text-ivory-50 py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 disabled:opacity-50"
                  >
                    {fetcher.state === 'submitting' ? '수정 중...' : '수정'}
                  </button>
                </div>
              </fetcher.Form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 