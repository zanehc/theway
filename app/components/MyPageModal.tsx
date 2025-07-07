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
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'password'>('profile');
  
  // 비밀번호 변경 관련 상태
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('새 비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    
    setPasswordLoading(true);
    try {
      // 현재 비밀번호 확인
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });
      
      if (signInError) {
        setPasswordError('현재 비밀번호가 올바르지 않습니다.');
        return;
      }
      
      // 새 비밀번호로 변경
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        setPasswordError('비밀번호 변경에 실패했습니다: ' + updateError.message);
        return;
      }
      
      setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => setPasswordSuccess(''), 3000);
      
    } catch (error) {
      setPasswordError('비밀번호 변경 중 오류가 발생했습니다.');
    } finally {
      setPasswordLoading(false);
    }
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
    <div className="fixed inset-0 bg-black/60 z-[50000]" onClick={onClose}>
      <div 
        className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-2xl w-full max-w-xs sm:max-w-4xl"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold z-10"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
        <h2 className="text-xl font-black text-wine-800 mb-4 text-center">마이페이지</h2>

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
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold transition-colors text-sm sm:text-base ${
              activeTab === 'password'
                ? 'bg-white text-wine-800 shadow-sm'
                : 'text-wine-600 hover:text-wine-800'
            }`}
          >
            비밀번호
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

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordChange} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
                현재 비밀번호
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-ivory-300 rounded-lg text-sm sm:text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                placeholder="현재 비밀번호를 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
                새 비밀번호
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-ivory-300 rounded-lg text-sm sm:text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                placeholder="새 비밀번호를 입력하세요 (최소 6자)"
                required
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
                새 비밀번호 확인
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-ivory-300 rounded-lg text-sm sm:text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
                placeholder="새 비밀번호를 다시 입력하세요"
                required
              />
            </div>

            {/* 오류 및 성공 메시지 */}
            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm font-medium">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm font-medium">{passwordSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full bg-gradient-wine text-black py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {passwordLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
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
                      {/* 주문 헤더 */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2 sm:gap-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="text-sm sm:text-lg font-bold text-wine-800">
                            {new Date(order.created_at).toLocaleDateString('ko-KR')}
                          </span>
                          <span className="text-xs sm:text-sm text-wine-600">
                            {new Date(order.created_at).toLocaleTimeString('ko-KR', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
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
                      
                      {/* 주문 상세 정보 */}
                      <div className="space-y-2 sm:space-y-3">
                        {/* 고객 정보 */}
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-wine-700 font-medium">고객명:</span>
                          <span className="text-wine-800 font-bold">{order.customer_name}</span>
                        </div>
                        
                        {order.church_group && (
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-wine-700 font-medium">목장:</span>
                            <span className="text-wine-800 font-bold">{order.church_group}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span className="text-wine-700 font-medium">결제방법:</span>
                          <span className="text-wine-800 font-bold">
                            {order.payment_method === 'cash' ? '현금' : '계좌이체'}
                          </span>
                        </div>
                      </div>
                      
                      {/* 주문 아이템 */}
                      <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
                        <div className="text-xs sm:text-sm font-bold text-wine-700 mb-2">주문 메뉴:</div>
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs sm:text-sm bg-white p-2 rounded-lg">
                            <span className="text-wine-700 font-medium">
                              {item.menu?.name} x {item.quantity}
                            </span>
                            <span className="text-wine-600 font-bold">
                              ₩{item.total_price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* 요청사항 */}
                      {order.notes && (
                        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-wine-50 rounded-lg border border-wine-100">
                          <div className="text-xs sm:text-sm font-bold text-wine-700 mb-1">요청사항:</div>
                          <p className="text-xs sm:text-sm text-wine-700">{order.notes}</p>
                        </div>
                      )}
                      
                      {/* 주문 상태 타임라인 */}
                      <div className="mt-3 sm:mt-4 pt-3 border-t border-ivory-200">
                        <div className="text-xs sm:text-sm font-bold text-wine-700 mb-2">주문 진행상황:</div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            order.status === 'pending' || order.status === 'preparing' || order.status === 'ready' || order.status === 'completed'
                              ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-xs text-wine-600">주문 접수</span>
                          
                          <div className="flex-1 h-1 bg-gray-200 rounded"></div>
                          
                          <div className={`w-3 h-3 rounded-full ${
                            order.status === 'preparing' || order.status === 'ready' || order.status === 'completed'
                              ? 'bg-blue-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-xs text-wine-600">제조중</span>
                          
                          <div className="flex-1 h-1 bg-gray-200 rounded"></div>
                          
                          <div className={`w-3 h-3 rounded-full ${
                            order.status === 'ready' || order.status === 'completed'
                              ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-xs text-wine-600">제조완료</span>
                          
                          <div className="flex-1 h-1 bg-gray-200 rounded"></div>
                          
                          <div className={`w-3 h-3 rounded-full ${
                            order.status === 'completed'
                              ? 'bg-wine-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-xs text-wine-600">픽업완료</span>
                        </div>
                      </div>
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