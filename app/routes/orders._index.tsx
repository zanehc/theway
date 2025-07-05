import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { getOrders, updateOrderStatus } from "~/lib/database";
import Header from "~/components/Header";
import type { OrderStatus } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    const orders = await getOrders(status || undefined);
    return json({ orders, currentStatus: status });
  } catch (error) {
    console.error('Orders loader error:', error);
    return json({ orders: [], currentStatus: null });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const orderId = formData.get('orderId') as string;
  const status = formData.get('status') as OrderStatus;
  const intent = formData.get('intent') as string;

  if (intent === 'updateStatus' && orderId && status) {
    try {
      await updateOrderStatus(orderId, status);
      return redirect('/orders');
    } catch (error) {
      console.error('Update status error:', error);
      return json({ error: '상태 업데이트에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

const statusOptions: { value: OrderStatus; label: string; color: string }[] = [
  { value: 'pending', label: '대기', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'preparing', label: '제조중', color: 'bg-blue-100 text-blue-800' },
  { value: 'ready', label: '완료', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: '픽업완료', color: 'bg-gray-100 text-gray-800' },
  { value: 'cancelled', label: '취소', color: 'bg-red-100 text-red-800' },
];

export default function Orders() {
  const { orders, currentStatus } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>(currentStatus || '');

  const filteredOrders = selectedStatus 
    ? orders.filter(order => order.status === selectedStatus)
    : orders;

  const getStatusColor = (status: OrderStatus) => {
    return statusOptions.find(option => option.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: OrderStatus) => {
    return statusOptions.find(option => option.value === status)?.label || status;
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const formData = new FormData();
    formData.append('intent', 'updateStatus');
    formData.append('orderId', orderId);
    formData.append('status', newStatus);
    fetcher.submit(formData, { method: 'post' });
  };

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-wine-800 mb-2">주문 현황</h1>
          <p className="text-wine-600">현재 주문 상태를 확인하고 관리하세요</p>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <span className="text-sm font-medium text-gray-700">상태별 필터:</span>
            <button
              onClick={() => setSelectedStatus('')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedStatus === '' 
                  ? 'bg-wine-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedStatus === option.value 
                    ? 'bg-wine-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 주문 목록 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-wine-800">
              주문 목록 ({filteredOrders.length}개)
            </h2>
          </div>
          
          {filteredOrders.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {order.customer_name}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        {order.church_group && (
                          <span className="px-3 py-1 bg-ivory-200 text-ivory-800 rounded-full text-sm font-medium">
                            {order.church_group}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">
                        주문 시간: {new Date(order.created_at).toLocaleString('ko-KR')}
                      </p>

                      {/* 주문 아이템 */}
                      <div className="space-y-2 mb-4">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">
                              {item.menu?.name} x {item.quantity}
                            </span>
                            <span className="text-gray-600">
                              ₩{item.total_price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                          요청사항: {order.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>결제: {order.payment_method === 'cash' ? '현금' : '계좌이체'}</span>
                          <span className={`px-2 py-1 rounded ${
                            order.payment_status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.payment_status === 'confirmed' ? '결제완료' : '결제대기'}
                          </span>
                        </div>
                        <span className="text-lg font-bold text-wine-600">
                          총 ₩{order.total_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* 상태 변경 버튼 */}
                    <div className="ml-6 flex flex-col space-y-2">
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <>
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'preparing')}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              제조 시작
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'ready')}
                              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                            >
                              제조 완료
                            </button>
                          )}
                          {order.status === 'ready' && (
                            <button
                              onClick={() => handleStatusChange(order.id, 'completed')}
                              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
                            >
                              픽업 완료
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            주문 취소
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-gray-500 text-lg">해당 상태의 주문이 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 