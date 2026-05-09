export default function PaymentStatusBadge({ status }: { status?: string }) {
  const isConfirmed = status === 'confirmed';

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${isConfirmed
      ? 'bg-green-100 text-green-800'
      : 'bg-secondary-bg text-body'
      }`}>
      <span className={`w-2 h-2 mr-2 rounded-full ${isConfirmed ? 'bg-green-500' : 'bg-ash'}`}></span>
      {isConfirmed ? '결제완료' : '결제대기'}
    </div>
  );
}
