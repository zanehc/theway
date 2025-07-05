import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { getMenus, createOrder } from "~/lib/database";
import Header from "~/components/Header";
import type { Menu } from "~/types";

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

      await createOrder({
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
    { id: 'coffee', name: '커피' },
    { id: 'tea', name: '차(TEA)' },
    { id: 'beverage', name: '음료' },
    { id: 'dessert', name: '디저트' },
    { id: 'brunch', name: '브런치' }
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
      setCart(prev => prev.map(item =>
        item.menu.id === menuId
          ? { ...item, quantity, total_price: quantity * item.menu.price }
          : item
      ));
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="mb-12 animate-fade-in">
          <h1 className="text-5xl font-black text-wine-800 mb-4 tracking-tight">새 주문</h1>
          <p className="text-2xl text-wine-600 font-medium">고객 주문을 입력하세요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메뉴 선택 */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 border border-ivory-200/50 animate-slide-up">
              <h2 className="text-3xl font-black text-wine-800 mb-8">메뉴 선택</h2>
              
              {/* 카테고리 필터 */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-4">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenus.map((menu) => (
                  <div key={menu.id} className="menu-card bg-white rounded-xl overflow-hidden shadow-medium hover:shadow-large transition-all duration-300 transform hover:-translate-y-2">
                    <div className="h-48 overflow-hidden bg-gradient-to-br from-ivory-100 to-ivory-200 flex items-center justify-center">
                      {menu.image_url ? (
                        <img 
                          src={menu.image_url} 
                          alt={menu.name} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xl font-bold text-wine-800">{menu.name}</h3>
                        <span className="text-wine-700 font-bold">₩{menu.price.toLocaleString()}</span>
                      </div>
                      {menu.description && (
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{menu.description}</p>
                      )}
                      <div className="flex justify-between items-center mb-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          menu.category === 'coffee' ? 'bg-wine-100 text-wine-800' :
                          menu.category === 'tea' ? 'bg-green-100 text-green-800' :
                          menu.category === 'beverage' ? 'bg-blue-100 text-blue-800' :
                          menu.category === 'dessert' ? 'bg-red-100 text-red-800' :
                          menu.category === 'brunch' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {menu.category === 'coffee' ? '커피' :
                           menu.category === 'tea' ? '차(TEA)' :
                           menu.category === 'beverage' ? '음료' :
                           menu.category === 'dessert' ? '디저트' :
                           menu.category === 'brunch' ? '브런치' : menu.category}
                        </span>
                        <button 
                          onClick={() => addToCart(menu)}
                          className="text-wine-600 hover:text-wine-800 transition-colors"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => addToCart(menu)}
                        className="w-full bg-gradient-wine text-ivory-50 py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
                      >
                        장바구니에 추가
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredMenus.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-lg text-wine-400 font-medium">선택한 카테고리에 메뉴가 없습니다.</p>
                </div>
              )}
            </div>
          </div>

          {/* 주문 정보 */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-ivory rounded-3xl shadow-soft p-8 border border-ivory-200/50 sticky top-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
              <h2 className="text-3xl font-black text-wine-800 mb-8">주문 정보</h2>
              
              <fetcher.Form onSubmit={handleSubmit} className="space-y-8">
                {/* 고객 정보 */}
                <div>
                  <label className="block text-xl font-bold text-wine-700 mb-4">
                    고객명 *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-6 py-4 border border-ivory-300 rounded-2xl text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                    placeholder="고객명을 입력하세요"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-wine-700 mb-4">
                    교회 그룹
                  </label>
                  <input
                    type="text"
                    value={churchGroup}
                    onChange={(e) => setChurchGroup(e.target.value)}
                    className="w-full px-6 py-4 border border-ivory-300 rounded-2xl text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                    placeholder="교회 그룹 (선택사항)"
                  />
                </div>

                <div>
                  <label className="block text-xl font-bold text-wine-700 mb-4">
                    결제 방법
                  </label>
                  <div className="space-y-4">
                    <label className="flex items-center space-x-4">
                      <input
                        type="radio"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
                        className="w-5 h-5 text-wine-600 focus:ring-wine-500"
                      />
                      <span className="text-lg font-bold text-wine-700">현금</span>
                    </label>
                    <label className="flex items-center space-x-4">
                      <input
                        type="radio"
                        value="transfer"
                        checked={paymentMethod === 'transfer'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
                        className="w-5 h-5 text-wine-600 focus:ring-wine-500"
                      />
                      <span className="text-lg font-bold text-wine-700">계좌이체</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xl font-bold text-wine-700 mb-4">
                    요청사항
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-6 py-4 border border-ivory-300 rounded-2xl text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300 resize-none"
                    placeholder="특별한 요청사항이 있으시면 입력해주세요"
                  />
                </div>

                {/* 장바구니 */}
                <div>
                  <h3 className="text-2xl font-black text-wine-800 mb-6">장바구니</h3>
                  {cart.length === 0 ? (
                    <p className="text-lg text-wine-400 font-medium text-center py-8">장바구니가 비어있습니다</p>
                  ) : (
                    <div className="space-y-4 mb-6">
                      {cart.map((item) => (
                        <div key={item.menu.id} className="bg-ivory-100/50 p-4 rounded-2xl border border-ivory-200">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-lg font-bold text-wine-800">{item.menu.name}</h4>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.menu.id)}
                              className="text-red-500 hover:text-red-700 text-lg font-bold"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.menu.id, item.quantity - 1)}
                                className="w-8 h-8 bg-wine-100 text-wine-700 rounded-full flex items-center justify-center font-bold hover:bg-wine-200 transition-colors"
                              >
                                -
                              </button>
                              <span className="text-lg font-bold text-wine-700 w-8 text-center">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.menu.id, item.quantity + 1)}
                                className="w-8 h-8 bg-wine-100 text-wine-700 rounded-full flex items-center justify-center font-bold hover:bg-wine-200 transition-colors"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-lg font-bold text-wine-600">₩{item.total_price.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="border-t border-ivory-200 pt-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-2xl font-bold text-wine-700">총 금액</span>
                      <span className="text-3xl font-black text-wine-600">₩{totalAmount.toLocaleString()}</span>
                    </div>
                    
                    <button
                      type="submit"
                      disabled={cart.length === 0 || !customerName.trim()}
                      className="w-full bg-gradient-wine text-ivory-50 py-6 px-8 rounded-2xl text-2xl font-black hover:shadow-wine transition-all duration-300 transform hover:-translate-y-1 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      주문 완료
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