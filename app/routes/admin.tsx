import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData, useActionData, useRevalidator } from "@remix-run/react";
import { useState } from "react";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Coffee,
  Users,
  BarChart3,
  Settings
} from "lucide-react";
import { supabase } from "~/lib/supabase.server";

interface Order {
  id: string;
  customer_name: string;
  church_group?: string;
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'transfer';
  payment_status: 'pending' | 'confirmed';
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  menu: {
    name: string;
  };
  quantity: number;
  unit_price: number;
}

interface Menu {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
}

export async function loader({ request }: LoaderFunctionArgs) {
  // 주문 목록 조회
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        quantity,
        unit_price,
        menu:menus (name)
      )
    `)
    .order('created_at', { ascending: false });

  // 메뉴 목록 조회
  const { data: menus } = await supabase
    .from('menus')
    .select('*')
    .order('category', { ascending: true });

  return json({ 
    orders: orders || [], 
    menus: menus || [] 
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const action = formData.get('action') as string;

  if (action === 'updateOrderStatus') {
    const orderId = formData.get('orderId') as string;
    const status = formData.get('status') as string;

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      return json({ error: "주문 상태 업데이트 실패" }, { status: 500 });
    }
  }

  if (action === 'updatePaymentStatus') {
    const orderId = formData.get('orderId') as string;
    const paymentStatus = formData.get('paymentStatus') as string;

    const { error } = await supabase
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId);

    if (error) {
      return json({ error: "결제 상태 업데이트 실패" }, { status: 500 });
    }
  }

  if (action === 'addMenu') {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const category = formData.get('category') as string;

    const { error } = await supabase
      .from('menus')
      .insert({
        name,
        description,
        price,
        category,
        is_available: true
      });

    if (error) {
      return json({ error: "메뉴 추가 실패" }, { status: 500 });
    }
  }

  if (action === 'updateMenu') {
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = parseFloat(formData.get('price') as string);
    const category = formData.get('category') as string;
    const is_available = formData.get('is_available') === 'true';

    const { error } = await supabase
      .from('menus')
      .update({
        name,
        description,
        price,
        category,
        is_available
      })
      .eq('id', id);

    if (error) {
      return json({ error: "메뉴 수정 실패" }, { status: 500 });
    }
  }

  return json({ success: true });
}

export default function AdminPage() {
  const { orders, menus } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const revalidator = useRevalidator();
  const [activeTab, setActiveTab] = useState<'orders' | 'menus'>('orders');
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => order.status === 'ready');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'preparing': return <Coffee className="w-4 h-4" />;
      case 'ready': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    const formData = new FormData();
    formData.append('action', 'updateOrderStatus');
    formData.append('orderId', orderId);
    formData.append('status', status);
    
    await fetch('/admin', { method: 'POST', body: formData });
    revalidator.revalidate();
  };

  const handlePaymentUpdate = async (orderId: string, paymentStatus: string) => {
    const formData = new FormData();
    formData.append('action', 'updatePaymentStatus');
    formData.append('orderId', orderId);
    formData.append('paymentStatus', paymentStatus);
    
    await fetch('/admin', { method: 'POST', body: formData });
    revalidator.revalidate();
  };

  return (
    <div className="min-h-screen bg-ivory-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-ivory-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-warm-brown-900">
              관리자 대시보드
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-warm-brown-600">
                총 주문: {orders.length}개
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탭 네비게이션 */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-ivory-200 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-white text-wine-red-600 shadow-sm'
                  : 'text-warm-brown-600 hover:text-warm-brown-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>주문 현황</span>
            </button>
            <button
              onClick={() => setActiveTab('menus')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'menus'
                  ? 'bg-white text-wine-red-600 shadow-sm'
                  : 'text-warm-brown-600 hover:text-warm-brown-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>메뉴 관리</span>
            </button>
          </div>
        </div>

        {actionData?.error && (
          <div className="mb-6 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
            {actionData.error}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* 대기 중인 주문 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-warm-brown-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                대기 중 ({pendingOrders.length})
              </h3>
              <div className="space-y-3">
                {pendingOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onStatusUpdate={handleStatusUpdate}
                    onPaymentUpdate={handlePaymentUpdate}
                  />
                ))}
                {pendingOrders.length === 0 && (
                  <p className="text-warm-brown-500 text-center py-4">
                    대기 중인 주문이 없습니다
                  </p>
                )}
              </div>
            </div>

            {/* 제조 중인 주문 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-warm-brown-900 mb-4 flex items-center">
                <Coffee className="w-5 h-5 text-blue-600 mr-2" />
                제조 중 ({preparingOrders.length})
              </h3>
              <div className="space-y-3">
                {preparingOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onStatusUpdate={handleStatusUpdate}
                    onPaymentUpdate={handlePaymentUpdate}
                  />
                ))}
                {preparingOrders.length === 0 && (
                  <p className="text-warm-brown-500 text-center py-4">
                    제조 중인 주문이 없습니다
                  </p>
                )}
              </div>
            </div>

            {/* 완료된 주문 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-warm-brown-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                완료 ({readyOrders.length})
              </h3>
              <div className="space-y-3">
                {readyOrders.map(order => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onStatusUpdate={handleStatusUpdate}
                    onPaymentUpdate={handlePaymentUpdate}
                  />
                ))}
                {readyOrders.length === 0 && (
                  <p className="text-warm-brown-500 text-center py-4">
                    완료된 주문이 없습니다
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menus' && (
          <div className="space-y-6">
            {/* 메뉴 추가 폼 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-warm-brown-900 mb-4">
                새 메뉴 추가
              </h3>
              <MenuForm 
                onSubmit={async (formData) => {
                  await fetch('/admin', { method: 'POST', body: formData });
                  revalidator.revalidate();
                }}
              />
            </div>

            {/* 메뉴 목록 */}
            <div className="card">
              <h3 className="text-lg font-semibold text-warm-brown-900 mb-4">
                메뉴 목록
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menus.map(menu => (
                  <MenuCard 
                    key={menu.id} 
                    menu={menu}
                    onEdit={() => setEditingMenu(menu)}
                    onUpdate={async (formData) => {
                      await fetch('/admin', { method: 'POST', body: formData });
                      revalidator.revalidate();
                      setEditingMenu(null);
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 메뉴 편집 모달 */}
      {editingMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-warm-brown-900 mb-4">
              메뉴 편집
            </h3>
            <MenuForm 
              menu={editingMenu}
              onSubmit={async (formData) => {
                await fetch('/admin', { method: 'POST', body: formData });
                revalidator.revalidate();
                setEditingMenu(null);
              }}
            />
            <button
              onClick={() => setEditingMenu(null)}
              className="mt-4 w-full btn-secondary"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({ 
  order, 
  onStatusUpdate, 
  onPaymentUpdate 
}: { 
  order: Order; 
  onStatusUpdate: (orderId: string, status: string) => void;
  onPaymentUpdate: (orderId: string, paymentStatus: string) => void;
}) {
  return (
    <div className="border border-ivory-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-semibold text-warm-brown-900">
            {order.customer_name}
          </h4>
          {order.church_group && (
            <p className="text-sm text-warm-brown-600">
              {order.church_group}
            </p>
          )}
          <p className="text-sm text-warm-brown-500">
            {new Date(order.created_at).toLocaleTimeString()}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {order.status}
        </span>
      </div>

      <div className="space-y-2 mb-3">
        {order.order_items.map(item => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.menu.name} × {item.quantity}</span>
            <span>₩{(item.unit_price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-ivory-200 pt-3">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">총 금액</span>
          <span className="font-semibold text-wine-red-600">
            ₩{order.total_amount.toLocaleString()}
          </span>
        </div>

        <div className="flex space-x-2 mb-3">
          <select
            value={order.status}
            onChange={(e) => onStatusUpdate(order.id, e.target.value)}
            className="flex-1 text-sm border border-ivory-300 rounded px-2 py-1"
          >
            <option value="pending">대기 중</option>
            <option value="preparing">제조 중</option>
            <option value="ready">완료</option>
            <option value="completed">픽업 완료</option>
            <option value="cancelled">취소</option>
          </select>
        </div>

        <div className="flex space-x-2">
          <select
            value={order.payment_status}
            onChange={(e) => onPaymentUpdate(order.id, e.target.value)}
            className="flex-1 text-sm border border-ivory-300 rounded px-2 py-1"
          >
            <option value="pending">결제 대기</option>
            <option value="confirmed">결제 완료</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function MenuForm({ 
  menu, 
  onSubmit 
}: { 
  menu?: Menu; 
  onSubmit: (formData: FormData) => void;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('action', menu ? 'updateMenu' : 'addMenu');
    if (menu) {
      formData.append('id', menu.id);
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-warm-brown-700 mb-1">
          메뉴명
        </label>
        <input
          type="text"
          name="name"
          defaultValue={menu?.name}
          required
          className="input-field"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-warm-brown-700 mb-1">
          설명
        </label>
        <textarea
          name="description"
          defaultValue={menu?.description}
          className="input-field"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-warm-brown-700 mb-1">
            가격
          </label>
          <input
            type="number"
            name="price"
            defaultValue={menu?.price}
            required
            min="0"
            step="100"
            className="input-field"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-warm-brown-700 mb-1">
            카테고리
          </label>
          <select name="category" defaultValue={menu?.category} required className="input-field">
            <option value="">선택하세요</option>
            <option value="coffee">커피</option>
            <option value="tea">차</option>
            <option value="juice">주스</option>
            <option value="smoothie">스무디</option>
            <option value="beverage">음료</option>
          </select>
        </div>
      </div>

      {menu && (
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="is_available"
              value="true"
              defaultChecked={menu.is_available}
              className="mr-2"
            />
            <span className="text-sm text-warm-brown-700">판매 가능</span>
          </label>
        </div>
      )}

      <button type="submit" className="btn-primary">
        {menu ? '수정' : '추가'}
      </button>
    </form>
  );
}

function MenuCard({ 
  menu, 
  onEdit, 
  onUpdate 
}: { 
  menu: Menu; 
  onEdit: () => void;
  onUpdate: (formData: FormData) => void;
}) {
  return (
    <div className="border border-ivory-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-semibold text-warm-brown-900">{menu.name}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          menu.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {menu.is_available ? '판매중' : '품절'}
        </span>
      </div>
      
      <p className="text-sm text-warm-brown-600 mb-2">{menu.description}</p>
      <p className="text-lg font-bold text-wine-red-600 mb-3">
        ₩{menu.price.toLocaleString()}
      </p>
      
      <div className="flex space-x-2">
        <button onClick={onEdit} className="btn-secondary flex-1">
          <Edit className="w-4 h-4 mr-1" />
          수정
        </button>
      </div>
    </div>
  );
} 