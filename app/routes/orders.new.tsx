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

  // 카테고리별로 메뉴 그룹화
  const menusByCategory = menus.reduce((acc, menu) => {
    if (!acc[menu.category]) {
      acc[menu.category] = [];
    }
    acc[menu.category].push(menu);
    return acc;
  }, {} as Record<string, Menu[]>);

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
    <div className="min-h-screen bg-ivory-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-wine-800 mb-2">새 주문</h1>
          <p className="text-wine-600">고객 주문을 입력하세요</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메뉴 선택 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-wine-800 mb-6">메뉴 선택</h2>
              
              {Object.entries(menusByCategory).map(([category, categoryMenus]) => (
                <div key={category} className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                    {category === 'coffee' ? '커피' : 
                     category === 'beverage' ? '음료' :
                     category === 'juice' ? '주스' :
                     category === 'smoothie' ? '스무디' : category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryMenus.map((menu) => (
                      <div key={menu.id} className="border border-gray-200 rounded-lg p-4 hover:border-wine-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{menu.name}</h4>
                          <span className="text-wine-600 font-semibold">₩{menu.price.toLocaleString()}</span>
                        </div>
                        {menu.description && (
                          <p className="text-sm text-gray-600 mb-3">{menu.description}</p>
                        )}
                        <button
                          onClick={() => addToCart(menu)}
                          className="w-full bg-wine-600 text-white py-2 px-4 rounded-md hover:bg-wine-700 transition-colors"
                        >
                          추가
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주문 정보 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-wine-800 mb-6">주문 정보</h2>
              
              <fetcher.Form onSubmit={handleSubmit} className="space-y-6">
                {/* 고객 정보 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    고객명 *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wine-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    목장
                  </label>
                  <input
                    type="text"
                    value={churchGroup}
                    onChange={(e) => setChurchGroup(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wine-500"
                    placeholder="목장명 (선택사항)"
                  />
                </div>

                {/* 결제 방법 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    결제 방법
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="cash"
                        checked={paymentMethod === 'cash'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
                        className="mr-2"
                      />
                      현금
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="transfer"
                        checked={paymentMethod === 'transfer'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
                        className="mr-2"
                      />
                      계좌이체
                    </label>
                  </div>
                </div>

                {/* 요청사항 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    요청사항
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-wine-500"
                    placeholder="특별한 요청사항이 있으시면 입력해주세요"
                  />
                </div>

                {/* 주문 항목 */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">주문 항목</h3>
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">메뉴를 선택해주세요</p>
                  ) : (
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div key={item.menu.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.menu.name}</p>
                            <p className="text-sm text-gray-600">₩{item.menu.price.toLocaleString()} x {item.quantity}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.menu.id, item.quantity - 1)}
                              className="w-6 h-6 bg-gray-300 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-400"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.menu.id, item.quantity + 1)}
                              className="w-6 h-6 bg-wine-600 text-white rounded-full flex items-center justify-center hover:bg-wine-700"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.menu.id)}
                              className="ml-2 text-red-600 hover:text-red-800"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 총 금액 */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>총 금액</span>
                    <span className="text-wine-600">₩{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* 주문 버튼 */}
                <button
                  type="submit"
                  disabled={cart.length === 0 || !customerName.trim() || fetcher.state === 'submitting'}
                  className="w-full bg-wine-600 text-white py-3 px-4 rounded-md hover:bg-wine-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {fetcher.state === 'submitting' ? '주문 처리 중...' : '주문 완료'}
                </button>
              </fetcher.Form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 