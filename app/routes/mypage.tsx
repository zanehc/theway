import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import { fetchOrderHistoryForCurrentUser } from '~/lib/orderHistoryClient';
import type { UserOrderHistory } from '~/types';
import { useNavigate, useOutletContext } from '@remix-run/react';
import { useNotifications } from '~/contexts/NotificationContext';
import { signOutAndClearSession } from '~/lib/authClient';

interface User {
  id: string;
  email: string;
  name: string;
  church_group?: string | null;
  role: string;
}

const PROFILE_TIMEOUT_MS = 2200;
const ORDER_HISTORY_TIMEOUT_MS = 3500;
const CACHE_TTL_MS = 60_000;

function getOrderNumber(order: any) {
  return order.order_number || order.id?.slice(-8) || '';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        console.warn('MyPage request timed out or failed:', error);
        resolve(fallback);
      });
  });
}

function buildFallbackUser(authUser: any): User {
  return {
    id: authUser.id,
    email: authUser.email || '',
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '',
    church_group: null,
    role: 'customer',
  };
}

const emptyOrderHistory: UserOrderHistory = {
  orders: [],
  total_orders: 0,
  total_spent: 0,
  recent_orders: [],
};

function getStoredAuthUser() {
  if (typeof window === 'undefined') return null;

  try {
    const storedSession = window.localStorage.getItem('theway-cafe-auth-token');
    if (!storedSession) return null;

    const parsed = JSON.parse(storedSession);
    return parsed?.user?.id ? parsed.user : null;
  } catch (error) {
    console.warn('MyPage stored session parse failed:', error);
    return null;
  }
}

function getProfileCacheKey(userId: string) {
  return `mypage_profile_${userId}`;
}

function getOrdersCacheKey(userId: string) {
  return `mypage_orders_${userId}`;
}

function readSessionCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return parsed.value as T;
  } catch (error) {
    console.warn('MyPage cache read failed:', error);
    return null;
  }
}

function writeSessionCache<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch (error) {
    console.warn('MyPage cache write failed:', error);
  }
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

async function fetchUserProfileFast(authUser: any): Promise<User | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const res = await fetch(`/api/profile-load?email=${encodeURIComponent(authUser.email || '')}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    console.warn('MyPage profile fetch failed:', res.status);
    return null;
  }

  const result = await res.json().catch(() => ({}));
  const data = result.user;
  if (!data) return null;

  return {
    id: String(data.id || authUser.id),
    email: String(data.email || authUser.email || ''),
    name: String(data.name || ''),
    church_group: typeof data.church_group === 'string' ? data.church_group : null,
    role: String(data.role || 'customer'),
  };
}

function toOrderHistory(orders: any[]): UserOrderHistory {
  return {
    orders,
    total_orders: orders.length,
    total_spent: orders
      .filter((order) => order.status !== 'cancelled')
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    recent_orders: orders.slice(0, 5),
  };
}

export default function MyPage() {
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const { user: contextUser } = useOutletContext<{ user: any; userRole: string | null; authChecked?: boolean }>();
  const [authUser, setAuthUser] = useState<any>(() => contextUser || getStoredAuthUser());
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = contextUser || getStoredAuthUser();
    return storedUser ? buildFallbackUser(storedUser) : null;
  });
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
    let isCancelled = false;

    const resolveUser = async () => {
      try {
        if (contextUser) {
          if (!isCancelled) {
            setAuthUser(contextUser);
            setUser((currentUser) => currentUser || buildFallbackUser(contextUser));
          }
          return;
        }

        const storedUser = getStoredAuthUser();
        if (storedUser && !isCancelled) {
          setAuthUser(storedUser);
          setUser((currentUser) => currentUser || buildFallbackUser(storedUser));
        }

        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          PROFILE_TIMEOUT_MS,
          { data: { session: null }, error: null }
        );
        if (!isCancelled) {
          const sessionUser = sessionResult.data.session?.user || storedUser || null;
          setAuthUser(sessionUser);
          if (sessionUser) {
            setUser((currentUser) => currentUser || buildFallbackUser(sessionUser));
          }
        }
      } catch (error) {
        console.error('❌ MyPage: session check failed:', error);
        if (!isCancelled) {
          setAuthUser(null);
        }
      }
    };

    resolveUser();
    return () => {
      isCancelled = true;
    };
  }, [contextUser]);

  useEffect(() => {
    if (authUser) {
      fetchUserData(authUser);
    } else {
      setUser(null);
      setOrderHistory(null);
    }
  }, [authUser]);

  const fetchUserData = async (authUser: any) => {
    const fallbackUser = buildFallbackUser(authUser);
    setUser((currentUser) => currentUser || fallbackUser);
    setName((currentName) => currentName || fallbackUser.name);

    const cachedProfile = readSessionCache<User>(getProfileCacheKey(authUser.id));
    if (cachedProfile) {
      setUser({ ...cachedProfile, email: cachedProfile.email || authUser.email || '' });
      setName(cachedProfile.name || '');
      setChurchGroup(cachedProfile.church_group || '');
    }

    const cachedOrders = readSessionCache<UserOrderHistory>(getOrdersCacheKey(authUser.id));
    if (cachedOrders) {
      setOrderHistory(cachedOrders);
    }

    try {
      console.log('🔄 MyPage: fetching user data for', authUser.id);

      const profilePromise = withTimeout(
        fetchUserProfileFast(authUser),
        PROFILE_TIMEOUT_MS,
        null
      );

      const orderHistoryPromise = fetchOrderHistoryForCurrentUser(authUser.id, {
        limit: 20,
        timeoutMs: ORDER_HISTORY_TIMEOUT_MS,
      });

      const [userData, orderResult] = await Promise.all([
        profilePromise,
        orderHistoryPromise,
      ]);

      if (userData) {
        console.log('🔄 MyPage: user data found/created:', userData);
        setUser({ ...userData, email: userData.email || authUser.email });
        setName(userData.name || '');
        setChurchGroup(userData.church_group || '');
        writeSessionCache(getProfileCacheKey(authUser.id), userData);
      } else {
        setUser(fallbackUser);
        setName(fallbackUser.name);
        setChurchGroup('');
      }

      const history = toOrderHistory(orderResult.orders || []);
      setOrderHistory(history);
      writeSessionCache(getOrdersCacheKey(authUser.id), history);
    } catch (error) {
      console.error('❌ MyPage: Error fetching user data:', error);
      setUser(fallbackUser);
      setName(fallbackUser.name);
      setChurchGroup('');
      setOrderHistory((currentHistory) => currentHistory || emptyOrderHistory);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 MyPage handleSubmit called');

    const userId = user?.id || authUser?.id;
    if (!userId) {
      console.error('❌ No user found');
      addToast('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        addToast('로그인 세션이 만료됐습니다. 다시 로그인해주세요.', 'error');
        return;
      }

      const res = await fetch('/api/profile-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          church_group: churchGroup.trim(),
          email: user?.email || authUser?.email || '',
        }),
      });

      const result = await res.json().catch(() => ({}));
      console.log('🔄 updateUser result:', result);

      if (res.ok && result.success) {
        console.log('✅ Update successful, refreshing user data');
        if (authUser) await fetchUserData(authUser);
        addToast('정보가 성공적으로 수정되었습니다!', 'success');
      } else {
        console.error('❌ Update failed:', result.error);
        addToast('정보 수정에 실패했습니다. 다시 시도해주세요.', 'error');
      }
    } catch (error) {
      console.error('❌ Error updating user:', error);
      addToast('정보 수정 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOutAndClearSession();
    window.location.replace('/');
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
        email: authUser?.email || user?.email || '',
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
      'completed': 'bg-surface-card text-ink',
      'cancelled': 'bg-red-100 text-error',
    };
    return colorMap[status] || 'bg-secondary-bg text-body';
  };

  if (!authUser) {
    return (
      <div className="min-h-screen bg-surface-soft pb-20">
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-2xl p-6 border border-hairline-soft">
            <h1 className="text-xl font-bold text-ink mb-3">로그인이 필요합니다</h1>
            <p className="text-mute mb-6">마이페이지는 로그인 후 이용할 수 있습니다.</p>
            <button
              onClick={() => navigate('/other')}
              className="w-full bg-primary text-white px-4 py-3 rounded-2xl font-bold hover:bg-primary-pressed"
            >
              로그인하러 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-soft pb-20">
      {/* 뒤로가기 버튼 */}
      <div className="bg-white  border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-mute hover:text-ink"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              뒤로가기
            </button>
            <h1 className="ml-4 text-xl font-bold text-ink">마이페이지</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow">
          {/* 탭 네비게이션 */}
          <div className="border-b border-hairline-soft">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-primary text-error'
                    : 'border-transparent text-mute hover:text-body hover:border-hairline'
                }`}
              >
                프로필
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-primary text-error'
                    : 'border-transparent text-mute hover:text-body hover:border-hairline'
                }`}
              >
                주문 내역
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'password'
                    ? 'border-primary text-error'
                    : 'border-transparent text-mute hover:text-body hover:border-hairline'
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
                <h2 className="text-lg font-medium text-ink mb-6">프로필 정보</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-body">이메일</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-1 block w-full px-3 py-2 border border-hairline rounded-2xl  bg-surface-soft text-mute"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-body">이름</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-hairline rounded-2xl  focus:outline-none focus:ring-focus-outer focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-body">소속 목장</label>
                    <input
                      type="text"
                      value={churchGroup}
                      onChange={(e) => setChurchGroup(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-hairline rounded-2xl  focus:outline-none focus:ring-focus-outer focus:border-primary"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-primary text-white px-4 py-2 rounded-2xl hover:bg-primary-pressed disabled:opacity-50"
                    >
                      {loading ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'orders' && (
              <div>
                <h2 className="text-lg font-medium text-ink mb-6">주문 내역</h2>
                {orderHistory ? (
                  <div className="space-y-4">
                    {orderHistory.orders.map((order) => (
                      <div key={order.id} className="border rounded-2xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-ink">
                              주문 #{getOrderNumber(order)}
                            </p>
                            <p className="text-sm text-mute">
                              {new Date(order.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="text-sm text-mute">
                          <p>총 금액: {order.total_amount.toLocaleString()}원</p>
                                                     {order.order_items && (
                             <div className="mt-2">
                               {order.order_items.map((item, index) => (
                                 <p key={index} className="text-mute">
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
                  <p className="text-mute">주문 내역이 없습니다.</p>
                )}
              </div>
            )}

            {activeTab === 'password' && (
              <div>
                <h2 className="text-lg font-medium text-ink mb-6">비밀번호 변경</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-body">현재 비밀번호</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-hairline rounded-2xl  focus:outline-none focus:ring-focus-outer focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-body">새 비밀번호</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-hairline rounded-2xl  focus:outline-none focus:ring-focus-outer focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-body">새 비밀번호 확인</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-hairline rounded-2xl  focus:outline-none focus:ring-focus-outer focus:border-primary"
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
                      className="bg-primary text-white px-4 py-2 rounded-2xl hover:bg-primary-pressed disabled:opacity-50"
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
            className="w-full bg-surface-dark text-white px-4 py-2 rounded-2xl hover:bg-charcoal"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
} 
