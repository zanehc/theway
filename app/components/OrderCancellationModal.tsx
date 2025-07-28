import { useState } from 'react';

interface OrderCancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orderInfo: {
    customerName: string;
    orderItems: string;
  };
}

export default function OrderCancellationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  orderInfo 
}: OrderCancellationModalProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const predefinedReasons = [
    '재료 소진',
    '기계 고장',
    '주문 오류',
    '고객 요청',
    '기타'
  ];

  const handleSubmit = async () => {
    const finalReason = reason === '기타' ? customReason : reason;
    
    if (!finalReason.trim()) {
      alert('취소 사유를 선택하거나 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('🔄 취소 처리 시작:', finalReason);
      await onConfirm(finalReason);
      console.log('✅ 취소 처리 완료');
      handleClose();
    } catch (error) {
      console.error('❌ 취소 처리 실패:', error);
      alert('주문 취소에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setCustomReason('');
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-wine-800">주문 취소</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 주문 정보 */}
        <div className="bg-ivory-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-wine-600 mb-1">고객명</div>
          <div className="font-bold text-wine-800 mb-3">{orderInfo.customerName}</div>
          <div className="text-sm text-wine-600 mb-1">주문 내용</div>
          <div className="text-wine-700">{orderInfo.orderItems}</div>
        </div>

        {/* 취소 사유 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-wine-700 mb-3">
            취소 사유를 선택해주세요
          </label>
          <div className="space-y-2">
            {predefinedReasons.map((reasonOption) => (
              <label 
                key={reasonOption} 
                className="flex items-center p-3 rounded-lg border border-wine-200 hover:bg-wine-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="cancellation-reason"
                  value={reasonOption}
                  checked={reason === reasonOption}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-4 h-4 text-wine-600 border-wine-300 focus:ring-wine-500"
                  disabled={isSubmitting}
                />
                <span className="ml-3 text-wine-700 font-medium">{reasonOption}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 기타 사유 입력 */}
        {reason === '기타' && (
          <div className="mb-6">
            <label className="block text-sm font-bold text-wine-700 mb-2">
              상세 취소 사유
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="취소 사유를 상세히 입력해주세요..."
              className="w-full px-4 py-3 border border-wine-300 rounded-lg focus:ring-2 focus:ring-wine-500 focus:border-wine-500 resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition-colors"
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (!reason || (reason === '기타' && !customReason.trim()))}
            className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                처리중...
              </div>
            ) : (
              '주문 취소'
            )}
          </button>
        </div>

        {/* 안내 메시지 */}
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-700">
            <strong>주의:</strong> 주문을 취소하면 고객에게 취소 사유와 함께 알림이 전송됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}