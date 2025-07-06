import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { getUserOrderHistory } from '~/lib/database';
import type { UserOrderHistory } from '~/types';

interface User {
  id: string;
  email: string;
  name: string;
  church_group?: string;
  role: string;
}

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MyPageModal({ isOpen, onClose }: MyPageModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderHistory, setOrderHistory] = useState<UserOrderHistory | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (userData) {
          setUser(userData);
          setName(userData.name || '');
          setChurchGroup(userData.church_group || '');
          
          // 주문 내역 조회
          const history = await getUserOrderHistory(authUser.id);
          setOrderHistory(history);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: name.trim(),
          church_group: churchGroup.trim() || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      // 업데이트된 사용자 정보 다시 조회
      await fetchUserData();
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
    window.location.replace('/'); // 항상 첫화면으로 이동
  };

  const getStatusLabel = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': '대기',
      'preparing': '제조중',
      'ready': '완료',
      'completed': '픽업완료',
      'cancelled': '취소',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'preparing': 'bg-blue-100 text-blue-800',
      'ready': 'bg-green-100 text-green-800',
      'completed': 'bg-wine-100 text-wine-800',
      'cancelled': 'bg-red-100 text-red-800',
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-none flex items-center justify-center p-3 sm:p-4 z-50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-large p-4 sm:p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-wine-800">마이페이지</h2>
          <button
            onClick={onClose}
            className="text-wine-600 hover:text-wine-800 transition-colors"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-1 mb-4 sm:mb-6 bg-ivory-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold transition-colors text-sm sm:text-base ${
              activeTab === 'profile'
                ? 'bg-white text-wine-800 shadow-sm'
                : 'text-wine-600 hover:text-wine-800'
            }`}
          >
            프로필
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold transition-colors text-sm sm:text-base ${
              activeTab === 'orders'
                ? 'bg-white text-wine-800 shadow-sm'
                : 'text-wine-600 hover:text-wine-800'
            }`}
          >
            주문 내역
          </button>
        </div>

        {activeTab === 'profile' && user && (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
                이메일
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-ivory-300 rounded-lg text-sm sm:text-lg font-medium bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-ivory-300 rounded-lg text-sm sm:text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
                목장
              </label>
              <input
                type="text"
                value={churchGroup}
                onChange={(e) => setChurchGroup(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-ivory-300 rounded-lg text-sm sm:text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                placeholder="목장명을 입력하세요"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
                권한
              </label>
              <input
                type="text"
                value={user.role === 'admin' ? '관리자' : '일반 사용자'}
                disabled
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-ivory-300 rounded-lg text-sm sm:text-lg font-medium bg-gray-100 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-wine text-black py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? '저장 중...' : '정보 수정'}
              </button>
              
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 sm:px-6 py-2 sm:py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors text-sm sm:text-base"
              >
                로그아웃
              </button>
            </div>
          </form>
        )}

        {activeTab === 'orders' && orderHistory && (
          <div className="space-y-4 sm:space-y-6">
            {/* 주문 통계 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-gradient-ivory rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-black text-wine-800">{orderHistory.total_orders}</div>
                <div className="text-xs sm:text-sm text-wine-600 font-medium">총 주문</div>
              </div>
              <div className="bg-gradient-ivory rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-black text-wine-800">₩{orderHistory.total_spent.toLocaleString()}</div>
                <div className="text-xs sm:text-sm text-wine-600 font-medium">총 결제액</div>
              </div>
              <div className="bg-gradient-ivory rounded-xl p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-black text-wine-800">
                  {orderHistory.orders.filter(o => o.payment_status === 'confirmed').length}
                </div>
                <div className="text-xs sm:text-sm text-wine-600 font-medium">결제완료</div>
              </div>
            </div>

            {/* 주문 목록 */}
            <div>
              <h3 className="text-lg sm:text-xl font-black text-wine-800 mb-3 sm:mb-4">주문 내역</h3>
              {orderHistory.orders.length > 0 ? (
                <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
                  {orderHistory.orders.map((order) => (
                    <div key={order.id} className="bg-ivory-50 rounded-xl p-3 sm:p-4 border border-ivory-200">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="text-sm sm:text-lg font-bold text-wine-800">
                            {new Date(order.created_at).toLocaleDateString('ko-KR')}
                          </span>
                          <span className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                          <span className={`px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-bold ${
                            order.payment_status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.payment_status === 'confirmed' ? '결제완료' : '결제대기'}
                          </span>
                        </div>
                        <span className="text-sm sm:text-lg font-black text-wine-800">
                          ₩{order.total_amount.toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="space-y-1 sm:space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs sm:text-sm">
                            <span className="text-wine-700">
                              {item.menu?.name} x {item.quantity}
                            </span>
                            <span className="text-wine-600 font-medium">
                              ₩{item.total_price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="mt-2 sm:mt-3 p-2 bg-wine-50 rounded-lg">
                          <p className="text-xs sm:text-sm text-wine-700">요청사항: {order.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-wine-400 text-sm sm:text-lg">주문 내역이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 