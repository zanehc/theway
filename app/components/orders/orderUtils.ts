import type { OrderStatus } from "~/types";

export const statusOptions: { value: OrderStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'pending', label: '대기', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  { value: 'preparing', label: '제조중', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'ready', label: '제조완료', color: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'completed', label: '픽업완료', color: 'text-wine-800', bgColor: 'bg-wine-100' },
  { value: 'cancelled', label: '취소', color: 'text-red-800', bgColor: 'bg-red-100' },
];

export const statusButtons = [
  { key: 'inprogress', label: '주문중' },
  { key: 'done', label: '주문완료' },
  { key: 'all', label: '전체' },
];

export const orderSteps = [
  { key: 'pending', label: '주문완료' },
  { key: 'preparing', label: '제조중' },
  { key: 'ready', label: '제조완료' },
  { key: 'completed', label: '픽업완료' },
];

export const getStatusColor = (status: OrderStatus) => {
  const option = statusOptions.find(opt => opt.value === status);
  return option?.color || 'text-gray-800';
};

export const getStatusBgColor = (status: OrderStatus) => {
  const option = statusOptions.find(opt => opt.value === status);
  return option?.bgColor || 'bg-gray-100';
};

export const getStatusLabel = (status: OrderStatus, paymentStatus?: string) => {
  if (paymentStatus === 'confirmed') return '결제완료';
  const option = statusOptions.find(opt => opt.value === status);
  return option?.label || status;
};
