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
  { value: 'tea', label: '차' },
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
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="mb-12 flex justify-between items-center animate-fade-in">
          <div>
            <h1 className="text-5xl font-black text-wine-800 mb-4 tracking-tight">메뉴 관리</h1>
            <p className="text-2xl text-wine-600 font-medium">카페 메뉴를 관리하세요</p>
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
            className="bg-gradient-wine text-ivory-50 px-8 py-4 rounded-2xl text-lg font-bold hover:shadow-wine transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
          >
            새 메뉴 추가
          </button>
        </div>

        {/* 메뉴 추가/수정 폼 */}
        {isAdding && (
          <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 mb-12 border border-ivory-200/50 animate-slide-up">
            <h2 className="text-3xl font-black text-wine-800 mb-8">
              {editingMenu ? '메뉴 수정' : '새 메뉴 추가'}
            </h2>
            
            <fetcher.Form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xl font-bold text-wine-700 mb-4">
                    메뉴명 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-6 py-4 border border-ivory-300 rounded-2xl text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                    placeholder="메뉴명을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-wine-700 mb-4">
                    가격 *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-6 py-4 border border-ivory-300 rounded-2xl text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                    placeholder="가격을 입력하세요"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xl font-bold text-wine-700 mb-4">
                  카테고리 *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-6 py-4 border border-ivory-300 rounded-2xl text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
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
                <label className="block text-xl font-bold text-wine-700 mb-4">
                  설명
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-6 py-4 border border-ivory-300 rounded-2xl text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300 resize-none"
                  placeholder="메뉴 설명을 입력하세요"
                />
              </div>

              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-5 h-5 text-wine-600 focus:ring-wine-500"
                />
                <label htmlFor="is_available" className="text-lg font-bold text-wine-700">
                  판매 가능
                </label>
              </div>

              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="bg-gradient-wine text-ivory-50 px-8 py-4 rounded-2xl text-lg font-bold hover:shadow-wine transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
                >
                  {editingMenu ? '수정 완료' : '추가 완료'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingMenu(null);
                    setFormData({
                      name: '',
                      description: '',
                      price: '',
                      category: 'coffee',
                      is_available: true,
                    });
                  }}
                  className="bg-ivory-200 text-wine-700 px-8 py-4 rounded-2xl text-lg font-bold hover:bg-ivory-300 transition-all duration-300 transform hover:-translate-y-1 shadow-soft"
                >
                  취소
                </button>
              </div>
            </fetcher.Form>
          </div>
        )}

        {/* 메뉴 목록 */}
        <div className="bg-gradient-ivory rounded-3xl shadow-soft border border-ivory-200/50 overflow-hidden animate-slide-up">
          <div className="px-12 py-8 border-b border-ivory-200/50 bg-ivory-100/30">
            <h2 className="text-3xl font-black text-wine-800">
              메뉴 목록 ({menus.length}개)
            </h2>
          </div>
          
          {menus.length > 0 ? (
            <div className="divide-y divide-ivory-200/50">
              {menus.map((menu, index) => (
                <div key={menu.id} className="p-8 hover:bg-ivory-100/50 transition-all duration-300 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-6 mb-4">
                        <h3 className="text-2xl font-black text-wine-800">{menu.name}</h3>
                        <span className="px-6 py-2 bg-ivory-200 text-wine-700 rounded-2xl text-lg font-bold shadow-sm">
                          {getCategoryLabel(menu.category)}
                        </span>
                        <span className={`px-6 py-2 rounded-2xl text-lg font-bold shadow-sm ${
                          menu.is_available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {menu.is_available ? '판매중' : '판매중지'}
                        </span>
                      </div>
                      
                      {menu.description && (
                        <p className="text-lg text-wine-600 mb-4 font-medium">{menu.description}</p>
                      )}
                      
                      <p className="text-3xl font-black text-wine-600">
                        ₩{menu.price.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleEdit(menu)}
                        className="px-6 py-3 bg-blue-100 text-blue-800 rounded-2xl text-lg font-bold hover:bg-blue-200 transition-all duration-300 transform hover:-translate-y-1 shadow-soft"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(menu.id)}
                        className="px-6 py-3 bg-red-100 text-red-800 rounded-2xl text-lg font-bold hover:bg-red-200 transition-all duration-300 transform hover:-translate-y-1 shadow-soft"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 text-center">
              <p className="text-wine-400 text-2xl font-medium">등록된 메뉴가 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 