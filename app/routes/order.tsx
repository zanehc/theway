import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useActionData } from "@remix-run/react";
import { useState } from "react";
import { Plus, Minus, ShoppingCart, User, Users } from "lucide-react";
import { supabase } from "~/lib/supabase.server";

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
}

interface CartItem extends MenuItem {
  quantity: number;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { data: menus } = await supabase
    .from('menus')
    .select('*')
    .eq('is_available', true)
    .order('category', { ascending: true });

  return json({ menus: menus || [] });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const customerName = formData.get('customerName') as string;
  const churchGroup = formData.get('churchGroup') as string;
  const paymentMethod = formData.get('paymentMethod') as 'cash' | 'transfer';
  const cartItems = JSON.parse(formData.get('cartItems') as string);
  const totalAmount = parseFloat(formData.get('totalAmount') as string);

  if (!customerName || cartItems.length === 0) {
    return json({ error: "고객명과 주문 항목을 입력해주세요." }, { status: 400 });
  }

  try {
    // 주문 생성
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_name: customerName,
        church_group: churchGroup || null,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        status: 'pending',
        payment_status: 'pending'
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // 주문 항목들 생성
    const orderItems = cartItems.map((item: CartItem) => ({
      order_id: order.id,
      menu_id: item.id,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return json({ success: true, orderId: order.id });
  } catch (error) {
    console.error('주문 생성 오류:', error);
    return json({ error: "주문 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export default function OrderPage() {
  const { menus } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...new Set(menus.map(menu => menu.category))];
  const filteredMenus = selectedCategory === 'all' 
    ? menus 
    : menus.filter(menu => menu.category === selectedCategory);

  const addToCart = (menu: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === menu.id);
      if (existing) {
        return prev.map(item => 
          item.id === menu.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...menu, quantity: 1 }];
    });
  };

  const removeFromCart = (menuId: string) => {
    setCart(prev => prev.filter(item => item.id !== menuId));
  };

  const updateQuantity = (menuId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuId);
      return;
    }
    setCart(prev => prev.map(item => 
      item.id === menuId ? { ...item, quantity } : item
    ));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (actionData?.success) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="card max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-warm-brown-900 mb-2">
            주문이 완료되었습니다!
          </h2>
          <p className="text-warm-brown-600 mb-6">
            주문번호: {actionData.orderId}
          </p>
          <a href="/order" className="btn-primary">
            새 주문하기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-ivory-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-warm-brown-900">
              음료 주문
            </h1>
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-wine-red-600" />
              <span className="text-sm font-medium text-warm-brown-700">
                {cart.length}개 항목
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 메뉴 선택 */}
          <div className="lg:col-span-2">
            {/* 카테고리 필터 */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-wine-red-600 text-white'
                        : 'bg-ivory-200 text-warm-brown-700 hover:bg-ivory-300'
                    }`}
                  >
                    {category === 'all' ? '전체' : category}
                  </button>
                ))}
              </div>
            </div>

            {/* 메뉴 그리드 */}
            <div className="grid md:grid-cols-2 gap-4">
              {filteredMenus.map(menu => (
                <div key={menu.id} className="card hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-warm-brown-900 mb-1">
                        {menu.name}
                      </h3>
                      <p className="text-sm text-warm-brown-600 mb-2">
                        {menu.description}
                      </p>
                      <p className="text-lg font-bold text-wine-red-600">
                        ₩{menu.price.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(menu)}
                      className="w-8 h-8 bg-wine-red-600 text-white rounded-full flex items-center justify-center hover:bg-wine-red-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 주문 카트 */}
          <div className="lg:col-span-1">
            <div className="card sticky top-8">
              <h2 className="text-lg font-semibold text-warm-brown-900 mb-4">
                주문 내역
              </h2>

              {cart.length === 0 ? (
                <p className="text-warm-brown-500 text-center py-8">
                  주문할 음료를 선택해주세요
                </p>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-ivory-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-warm-brown-900">
                            {item.name}
                          </h4>
                          <p className="text-sm text-warm-brown-600">
                            ₩{item.price.toLocaleString()} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 bg-ivory-200 text-warm-brown-700 rounded flex items-center justify-center hover:bg-ivory-300"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 bg-wine-red-600 text-white rounded flex items-center justify-center hover:bg-wine-red-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-ivory-200 pt-4 mb-6">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>총 금액</span>
                      <span className="text-wine-red-600">
                        ₩{totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* 주문 폼 */}
                  <Form method="post">
                    <input type="hidden" name="cartItems" value={JSON.stringify(cart)} />
                    <input type="hidden" name="totalAmount" value={totalAmount} />
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-warm-brown-700 mb-2">
                          고객명 *
                        </label>
                        <input
                          type="text"
                          name="customerName"
                          required
                          className="input-field"
                          placeholder="고객명을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-warm-brown-700 mb-2">
                          목장 (선택사항)
                        </label>
                        <input
                          type="text"
                          name="churchGroup"
                          className="input-field"
                          placeholder="목장명을 입력하세요"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-warm-brown-700 mb-2">
                          결제 방법 *
                        </label>
                        <select name="paymentMethod" required className="input-field">
                          <option value="">결제 방법을 선택하세요</option>
                          <option value="cash">현금</option>
                          <option value="transfer">계좌이체</option>
                        </select>
                      </div>

                      {actionData?.error && (
                        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                          {actionData.error}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full btn-primary py-3"
                        disabled={cart.length === 0}
                      >
                        주문 완료
                      </button>
                    </div>
                  </Form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 