import { orderSteps } from './orderUtils';

export default function OrderStatusProgress({ status, paymentStatus }: { status: string; paymentStatus?: string }) {
  if (status === 'cancelled') {
    return (
      <div className="w-full flex items-center justify-center mb-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
          취소됨
        </span>
      </div>
    );
  }

  const orderStep = orderSteps.findIndex(s => s.key === status);
  const isPaymentConfirmed = paymentStatus === 'confirmed';

  return (
    <div className="w-full flex flex-col items-center mb-2">
      <div className="flex w-full justify-between mb-1">
        {orderSteps.slice(0, 4).map((step, idx) => (
          <span
            key={step.key}
            className={`text-xs font-bold ${idx <= orderStep ? 'text-ink' : 'text-ash'}`}
            style={{ minWidth: 50, textAlign: 'center' }}
          >
            {step.label}
          </span>
        ))}
        <span
          className={`text-xs font-bold ${isPaymentConfirmed ? 'text-green-700' : 'text-ash'}`}
          style={{ minWidth: 50, textAlign: 'center' }}
        >
          결제완료
        </span>
      </div>

      <div className="relative w-full h-2 bg-secondary-bg rounded-full mb-1">
        <div
          className="absolute h-2 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.min(((orderStep + 1) / 4) * 80, 80)}%` }}
        />
        <div
          className={`absolute h-2 rounded-full transition-all duration-500 ${isPaymentConfirmed ? 'bg-green-500' : 'bg-secondary-bg'}`}
          style={{ width: '20%', right: 0 }}
        />
      </div>
    </div>
  );
}
