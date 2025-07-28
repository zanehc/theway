import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { getUserOrderHistory, updateUser, getUserByIdOrCreate } from '~/lib/database';
import type { UserOrderHistory } from '~/types';
import { useNavigate } from '@remix-run/react';
import { useNotifications } from '~/contexts/NotificationContext';

interface User {
  id: string;
  email: string;
  name: string;
  church_group?: string | null;
  role: string;
}

export default function MyPage() {
  const navigate = useNavigate();
  const { addToast } = useNotifications();
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
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        console.log('🔄 MyPage: fetching user data for', authUser.id);
        
        // 사용자 정보 조회 (없으면 생성)
        const userData = await getUserByIdOrCreate(authUser);

        if (userData) {
          console.log('🔄 MyPage: user data found/created:', userData);
          setUser(userData);
          setName(userData.name || '');
          setChurchGroup(userData.church_group || '');
          
          // 주문 내역 조회
          const history = await getUserOrderHistory(authUser.id);
          setOrderHistory(history);
        } else {
          console.error('❌ MyPage: failed to get/create user data');
        }
      }
    } catch (error) {
      console.error('❌ MyPage: Error fetching user data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 MyPage handleSubmit called');
    
    if (!user) {
      console.error('❌ No user found');
      return;
    }

    console.log('🔄 Current user:', user);
    console.log('🔄 Form data:', { name: name.trim(), church_group: churchGroup.trim() });

    setLoading(true);
    try {
      const result = await updateUser(user.id, {
        name: name.trim(),
        church_group: churchGroup.trim() || undefined,
      });

      console.log('🔄 updateUser result:', result);

      if (result.success) {
        console.log('✅ Update successful, refreshing user data');
        // 업데이트된 사용자 정보 다시 조회
        await fetchUserData();
        
        // 성공 토스트 알림 표시
        addToast('정보가 성공적으로 수정되었습니다! 🎉', 'success');
      } else {
        console.error('❌ Update failed:', result.error);
        throw new Error('사용자 정보 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('❌ Error updating user:', error);
      addToast('정보 수정 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
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

  const getStatusLabel = (status: string, paymentStatus?: string) => {
    // 결제완료 상태가 우선순위가 높음
    if (paymentStatus === 'confirmed') {
      return '결제완료';
    }
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 뒤로가기 버튼 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </button>
            <h1 className="ml-4 text-xl font-bold text-gray-900">마이페이지</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-red-800 text-red-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                프로필
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-red-800 text-red-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                주문 내역
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-red-800 text-red-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                비밀번호 변경
              </button>
            </nav>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-6">프로필 정보</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이메일</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">이름</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">소속 목장</label>
                    <input
                      type="text"
                      value={churchGroup}
                      onChange={(e) => setChurchGroup(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-6">주문 내역</h2>
                {orderHistory ? (
                  <div className="space-y-4">
                    {orderHistory.orders.map((order) => (
                      <div key={order.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">
                              주문 #{order.id.slice(-8)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status, order.payment_status)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>총 금액: {order.total_amount.toLocaleString()}원</p>
                                                     {order.order_items && (
                             <div className="mt-2">
                               {order.order_items.map((item, index) => (
                                 <p key={index} className="text-gray-500">
                                   {item.menu?.name || '메뉴명 없음'} x {item.quantity}
                                 </p>
                               ))}
                             </div>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">주문 내역이 없습니다.</p>
                )}
              </div>
            )}

            {activeTab === 'password' && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-6">비밀번호 변경</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">새 비밀번호</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                      required
                    />
                  </div>
                  {passwordError && (
                    <p className="text-red-600 text-sm">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-green-600 text-sm">{passwordSuccess}</p>
                  )}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="bg-red-800 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {passwordLoading ? '변경 중...' : '비밀번호 변경'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* 로그아웃 버튼 */}
        <div className="mt-6">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
} 