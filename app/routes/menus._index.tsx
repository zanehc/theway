import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { supabase } from "~/lib/supabase";
import Header from "~/components/Header";
import type { Menu } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return json({ menus: data as Menu[] });
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
      const { data, error } = await supabase
        .from('menus')
        .insert({
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          price: parseFloat(formData.get('price') as string),
          category: formData.get('category') as string,
          is_available: formData.get('is_available') === 'true',
        })
        .select()
        .single();

      if (error) throw error;
      return redirect('/menus');
    } catch (error) {
      console.error('Create menu error:', error);
      return json({ error: '메뉴 생성에 실패했습니다.' }, { status: 400 });
    }
  }

  if (intent === 'updateMenu') {
    try {
      const id = formData.get('id') as string;
      const { error } = await supabase
        .from('menus')
        .update({
          name: formData.get('name') as string,
          description: formData.get('description') as string,
          price: parseFloat(formData.get('price') as string),
          category: formData.get('category') as string,
          is_available: formData.get('is_available') === 'true',
        })
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

const categories = [
  { value: 'coffee', label: '커피' },
  { value: 'beverage', label: '음료' },
  { value: 'juice', label: '주스' },
  { value: 'smoothie', label: '스무디' },
];

export default function Menus() {
  const { menus } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [isAdding, setIsAdding] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'coffee',
    is_available: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = new FormData();
    form.append('intent', editingMenu ? 'updateMenu' : 'createMenu');
    if (editingMenu) {
      form.append('id', editingMenu.id);
    }
    form.append('name', formData.name);
    form.append('description', formData.description);
    form.append('price', formData.price);
    form.append('category', formData.category);
    form.append('is_available', formData.is_available.toString());

    fetcher.submit(form, { method: 'post' });
    
    // 폼 초기화
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'coffee',
      is_available: true,
    });
    setIsAdding(false);
    setEditingMenu(null);
  };

  const handleEdit = (menu: Menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      description: menu.description || '',
      price: menu.price.toString(),
      category: menu.category,
      is_available: menu.is_available,
    });
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말로 이 메뉴를 삭제하시겠습니까?')) {
      const form = new FormData();
      form.append('intent', 'deleteMenu');
      form.append('id', id);
      fetcher.submit(form, { method: 'post' });
    }
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.value === category)?.label || category;
  };

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-wine-800 mb-2">메뉴 관리</h1>
            <p className="text-wine-600">카페 메뉴를 관리하세요</p>
          </div>
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingMenu(null);
              setFormData({
                name: '',
                description: '',
                price: '',
                category: 'coffee',
                is_available: true,
              });
            }}
            className="bg-wine-600 text-white px-6 py-3 rounded-md hover:bg-wine-700 transition-colors"
          >
            새 메뉴 추가
          </button>
        </div>

        {/* 메뉴 추가/수정 폼 */}
        {isAdding && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-wine-800 mb-6">
              {editingMenu ? '메뉴 수정' : '새 메뉴 추가'}
            </h2>
            
            <fetcher.Form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    메뉴명 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wine-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    가격 *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wine-500"
                    min="0"
                    step="100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    카테고리 *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wine-500"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상태
                  </label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_available}
                      onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">판매 가능</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wine-500"
                  placeholder="메뉴에 대한 설명을 입력하세요"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingMenu(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-wine-600 text-white rounded-md hover:bg-wine-700 transition-colors"
                >
                  {editingMenu ? '수정' : '추가'}
                </button>
              </div>
            </fetcher.Form>
          </div>
        )}

        {/* 메뉴 목록 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-wine-800">
              메뉴 목록 ({menus.length}개)
            </h2>
          </div>
          
          {menus.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {menus.map((menu) => (
                <div key={menu.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{menu.name}</h3>
                        <span className="px-3 py-1 bg-ivory-200 text-ivory-800 rounded-full text-sm font-medium">
                          {getCategoryLabel(menu.category)}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          menu.is_available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {menu.is_available ? '판매중' : '판매중지'}
                        </span>
                      </div>
                      
                      {menu.description && (
                        <p className="text-gray-600 mb-2">{menu.description}</p>
                      )}
                      
                      <p className="text-lg font-bold text-wine-600">
                        ₩{menu.price.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(menu)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(menu.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">등록된 메뉴가 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 