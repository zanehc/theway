import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getMenus, createOrder } from "~/lib/database";
import Header from "~/components/Header";
import type { Menu } from "~/types";
import { supabase } from "~/lib/supabase";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const menus = await getMenus();
    return json({ menus });
  } catch (error) {
    console.error('New order loader error:', error);
    return json({ menus: [] });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'createOrder') {
    try {
      const customerName = formData.get('customerName') as string;
      const churchGroup = formData.get('churchGroup') as string;
      const paymentMethod = formData.get('paymentMethod') as 'cash' | 'transfer';
      const notes = formData.get('notes') as string;
      const items = JSON.parse(formData.get('items') as string);

      if (!customerName || !items || items.length === 0) {
        return json({ error: '고객명과 주문 항목을 입력해주세요.' }, { status: 400 });
      }

      const totalAmount = items.reduce((sum: number, item: any) => sum + item.total_price, 0);

      // 현재 로그인한 사용자 ID 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || undefined;

      await createOrder({
        user_id: userId,
        customer_name: customerName,
        church_group: churchGroup || undefined,
        payment_method: paymentMethod,
        notes: notes || undefined,
        total_amount: totalAmount,
        items: items,
      });

      return redirect('/orders');
    } catch (error) {
      console.error('Create order error:', error);
      return json({ error: '주문 생성에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

type CartItem = {
  menu: Menu;
  quantity: number;
  total_price: number;
};

export default function NewOrder() {
  const { menus } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // 주문 제출 상태 확인
  const isSubmitting = fetcher.state === 'submitting';
  const actionData = fetcher.data as { error?: string } | undefined;

  useEffect(() => {
    async function fetchUserInfo() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('name, church_group')
          .eq('id', user.id)
          .single();
        if (userData) {
          setCustomerName(userData.name || '');
          setChurchGroup(userData.church_group || '');
        }
      }
    }
    fetchUserInfo();

    // 재주문 정보가 있으면 자동 채우기
    const reorderRaw = localStorage.getItem('reorder');
    if (reorderRaw) {
      try {
        const reorder = JSON.parse(reorderRaw);
        setCustomerName(reorder.customerName || '');
        setChurchGroup(reorder.churchGroup || '');
        setPaymentMethod(reorder.paymentMethod || 'cash');
        setNotes(reorder.notes || '');
        // 메뉴 id로 메뉴 객체 매칭
        if (Array.isArray(reorder.items)) {
          const cartItems = reorder.items.map((item: any) => {
            const menu = menus.find((m: any) => m.id === item.menu_id);
            if (!menu) return null;
            return {
              menu,
              quantity: item.quantity,
              total_price: item.total_price,
            };
          }).filter(Boolean);
          setCart(cartItems);
        }
      } catch (e) { /* 무시 */ }
      localStorage.removeItem('reorder');
    }
  }, [menus]);

  // 에러 메시지 표시
  useEffect(() => {
    if (actionData?.error) {
      alert(actionData.error);
    }
  }, [actionData]);

  // 카테고리별로 메뉴 그룹화
  const menusByCategory = menus.reduce((acc, menu) => {
    if (!acc[menu.category]) {
      acc[menu.category] = [];
    }
    acc[menu.category].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

  // 카테고리 목록
  const categories = [
    { id: 'all', name: '전체' },
    { id: 'hot coffee', name: 'Hot 커피' },
    { id: 'ice coffee', name: 'Ice 커피' },
    { id: 'tea', name: '차' },
    { id: 'beverage', name: '음료' }
  ];

  // 선택된 카테고리에 따른 메뉴 필터링
  const filteredMenus = selectedCategory === 'all' 
    ? menus 
    : menus.filter(menu => menu.category === selectedCategory);

  const addToCart = (menu: Menu) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.menu.id === menu.id);
      if (existingItem) {
        return prev.map(item =>
          item.menu.id === menu.id
            ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * menu.price }
            : item
        );
      }
      return [...prev, { menu, quantity: 1, total_price: menu.price }];
    });
  };

  const updateQuantity = (menuId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.menu.id !== menuId));
    } else {
      setCart(prev => {
        const existingItem = prev.find(item => item.menu.id === menuId);
        if (existingItem) {
          return prev.map(item =>
            item.menu.id === menuId
              ? { ...item, quantity, total_price: quantity * item.menu.price }
              : item
          );
        } else {
          // 아이템이 없으면 새로 추가
          const menu = menus.find(m => m.id === menuId);
          if (menu) {
            return [...prev, { menu, quantity, total_price: quantity * menu.price }];
          }
        }
        return prev;
      });
    }
  };

  const removeFromCart = (menuId: string) => {
    setCart(prev => prev.filter(item => item.menu.id !== menuId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.total_price, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      alert('고객명을 입력해주세요.');
      return;
    }

    if (cart.length === 0) {
      alert('주문 항목을 추가해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('intent', 'createOrder');
    formData.append('customerName', customerName);
    formData.append('churchGroup', churchGroup);
    formData.append('paymentMethod', paymentMethod);
    formData.append('notes', notes);
    formData.append('items', JSON.stringify(cart.map(item => ({
      menu_id: item.menu.id,
      quantity: item.quantity,
      unit_price: item.menu.price,
      total_price: item.total_price,
    }))));

    fetcher.submit(formData, { method: 'post' });
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-12">
        <div className="mb-8 sm:mb-12 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl font-black text-wine-800 mb-2 sm:mb-4 tracking-tight">새 주문</h1>
          <p className="text-lg sm:text-2xl text-wine-600 font-medium">고객 주문을 입력하세요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* 메뉴 선택 */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-ivory rounded-2xl sm:rounded-3xl shadow-soft p-4 sm:p-8 border border-ivory-200/50 animate-slide-up">
              <h2 className="text-2xl sm:text-3xl font-black text-wine-800 mb-6 sm:mb-8">메뉴 선택</h2>
              
              {/* 카테고리 필터 */}
              <div className="mb-6 sm:mb-8">
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 sm:px-6 py-2 sm:py-3 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                        selectedCategory === category.id
                          ? 'bg-wine-700 text-ivory-50 shadow-medium'
                          : 'bg-ivory-200/80 text-wine-700 hover:bg-wine-100 hover:text-wine-900'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 메뉴 카드 그리드 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredMenus.length === 0 ? (
                  <div className="col-span-full text-center py-8 sm:py-12">
                    <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-wine-600 mx-auto mb-4"></div>
                    <p className="text-base sm:text-lg text-wine-400 font-medium">메뉴를 불러오는 중...</p>
                  </div>
                ) : (
                  filteredMenus.map((menu) => (
                  <div key={menu.id} className="menu-card bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-medium hover:shadow-large transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2">
                    <div className="h-32 sm:h-48 overflow-hidden bg-gradient-to-br from-ivory-100 to-ivory-200 flex items-center justify-center">
                      {menu.image_url ? (
                        <img 
                          src={menu.image_url} 
                          alt={menu.name} 
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 sm:w-16 sm:h-16 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="flex justify-between items-center mb-2 sm:mb-3">
                        <h3 className="text-lg sm:text-xl font-bold text-wine-800">{menu.name}</h3>
                        <span className="text-wine-700 font-bold text-sm sm:text-base">₩{menu.price.toLocaleString()}</span>
                      </div>
                      {menu.description && (
                        <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">{menu.description}</p>
                      )}
                      <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <span className={`text-xs px-2 sm:px-3 py-1 rounded-full font-medium ${
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
                      </div>
                      
                      {/* 수량 조절 */}
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <span className="text-xs sm:text-sm font-medium text-wine-700">수량</span>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <button
                            onClick={() => {
                              const currentItem = cart.find(item => item.menu.id === menu.id);
                              const currentQuantity = currentItem ? currentItem.quantity : 0;
                              if (currentQuantity > 0) {
                                updateQuantity(menu.id, currentQuantity - 1);
                              }
                            }}
                            className="w-6 h-6 sm:w-8 sm:h-8 bg-wine-100 text-wine-700 rounded-full flex items-center justify-center font-bold hover:bg-wine-200 transition-colors disabled:opacity-50 text-sm sm:text-base"
                            disabled={!cart.find(item => item.menu.id === menu.id) || (cart.find(item => item.menu.id === menu.id)?.quantity || 0) <= 0}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={cart.find(item => item.menu.id === menu.id)?.quantity || 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              const clampedValue = Math.min(Math.max(value, 0), 99);
                              updateQuantity(menu.id, clampedValue);
                            }}
                            className="w-10 sm:w-12 h-6 sm:h-8 text-center border border-ivory-300 rounded-lg text-xs sm:text-sm font-bold bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                          />
                          <button
                            onClick={() => {
                              const currentItem = cart.find(item => item.menu.id === menu.id);
                              const currentQuantity = currentItem ? currentItem.quantity : 0;
                              updateQuantity(menu.id, currentQuantity + 1);
                            }}
                            className="w-6 h-6 sm:w-8 sm:h-8 bg-wine-100 text-wine-700 rounded-full flex items-center justify-center font-bold hover:bg-wine-200 transition-colors text-sm sm:text-base"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          const currentItem = cart.find(item => item.menu.id === menu.id);
                          const currentQuantity = currentItem ? currentItem.quantity : 0;
                          updateQuantity(menu.id, currentQuantity + 1);
                        }}
                        className="w-full bg-gradient-wine text-ivory-50 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 transform hover:-translate-y-1 shadow-medium text-sm sm:text-base"
                      >
                        {cart.find(item => item.menu.id === menu.id) ? '수량 추가' : '장바구니에 추가'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {filteredMenus.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-base sm:text-lg text-wine-400 font-medium">선택한 카테고리에 메뉴가 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 주문 정보 */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-ivory rounded-2xl sm:rounded-3xl shadow-soft p-4 sm:p-8 border border-ivory-200/50 sticky top-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
              <h2 className="text-2xl sm:text-3xl font-black text-wine-800 mb-6 sm:mb-8">주문 정보</h2>
              
              <fetcher.Form method="post" onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* 고객 정보 */}
                <div>
                  <label className="block text-lg sm:text-xl font-bold text-wine-700 mb-1 sm:mb-2">
                    고객명 *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 border border-ivory-300 rounded-xl sm:rounded-2xl text-base sm:text-lg font-medium bg-ivory-50/50 text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                    placeholder="고객명을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-lg sm:text-xl font-bold text-wine-700 mb-1 sm:mb-2">
                    목장명
                  </label>
                  <input
                    type="text"
                    value={churchGroup}
                    onChange={(e) => setChurchGroup(e.target.value)}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 border border-ivory-300 rounded-xl sm:rounded-2xl text-base sm:text-lg font-medium bg-ivory-50/50 text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                    placeholder="목장명 (선택사항)"
                  />
                </div>

                <div>
                  <label className="block text-lg sm:text-xl font-bold text-wine-700 mb-1 sm:mb-2">
                    결제 방법
                  </label>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="flex items-center space-x-3 sm:space-x-4">
                      <input
                        type="radio"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-wine-600 focus:ring-wine-500"
                      />
                      <span className="text-base sm:text-lg font-bold text-wine-700">현금</span>
                    </label>
                    <label className="flex items-center space-x-3 sm:space-x-4">
                      <input
                        type="radio"
                        value="transfer"
                        checked={paymentMethod === 'transfer'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
                        className="w-4 h-4 sm:w-5 sm:h-5 text-wine-600 focus:ring-wine-500"
                      />
                      <span className="text-base sm:text-lg font-bold text-wine-700">계좌이체</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-lg sm:text-xl font-bold text-wine-700 mb-1 sm:mb-2">
                    요청사항
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 border border-ivory-300 rounded-xl sm:rounded-2xl text-base sm:text-lg font-medium bg-ivory-50/50 text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300 resize-none"
                    placeholder="특별한 요청사항이 있으시면 입력해주세요"
                  />
                </div>

                {/* 장바구니 */}
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-wine-800 mb-3 sm:mb-4">장바구니</h3>
                  {cart.length === 0 ? (
                    <p className="text-base sm:text-lg text-wine-400 font-medium text-center py-6 sm:py-8">장바구니가 비어있습니다</p>
                  ) : (
                    <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                      {cart.map((item) => (
                        <div key={item.menu.id} className="bg-ivory-100/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-ivory-200">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-base sm:text-lg font-bold text-wine-800">{item.menu.name}</h4>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.menu.id)}
                              className="text-red-500 hover:text-red-700 text-base sm:text-lg font-bold"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2 sm:space-x-4">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.menu.id, item.quantity - 1)}
                                className="w-6 h-6 sm:w-8 sm:h-8 bg-wine-100 text-wine-700 rounded-full flex items-center justify-center font-bold hover:bg-wine-200 transition-colors disabled:opacity-50 text-sm sm:text-base"
                                disabled={item.quantity <= 0}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={item.quantity}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  const clampedValue = Math.min(Math.max(value, 0), 99);
                                  updateQuantity(item.menu.id, clampedValue);
                                }}
                                className="w-10 sm:w-12 h-6 sm:h-8 text-center border border-ivory-300 rounded-lg text-xs sm:text-sm font-bold bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.menu.id, item.quantity + 1)}
                                className="w-6 h-6 sm:w-8 sm:h-8 bg-wine-100 text-wine-700 rounded-full flex items-center justify-center font-bold hover:bg-wine-200 transition-colors text-sm sm:text-base"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-base sm:text-lg font-bold text-wine-600">₩{item.total_price.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="border-t border-ivory-200 pt-4 sm:pt-6">
                    <div className="flex justify-between items-center mb-3 sm:mb-4">
                      <span className="text-xl sm:text-2xl font-bold text-wine-700">총 금액</span>
                      <span className="text-2xl sm:text-3xl font-black text-wine-600">₩{totalAmount.toLocaleString()}</span>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={cart.length === 0 || !customerName.trim() || isSubmitting}
                      className="w-full bg-gradient-wine text-ivory-50 py-4 sm:py-6 px-6 sm:px-8 rounded-xl sm:rounded-2xl text-lg sm:text-2xl font-black hover:shadow-wine transition-all duration-300 transform hover:-translate-y-1 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {isSubmitting ? '주문 처리 중...' : '주문 완료'}
                    </button>
                  </div>
                </div>
              </fetcher.Form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 