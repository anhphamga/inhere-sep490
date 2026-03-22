import { can } from '../../utils/access-control';
import StatusBadge from './StatusBadge';

const actionMatrix = {
  Deposited: { label: 'Confirm Order', permission: 'orders_rent.order.confirm' },
  Confirmed: { label: 'Pickup', permission: 'orders_rent.pickup.complete' },
  Renting: { label: 'Process Return', permission: 'orders_rent.return.process' },
  Late: { label: 'Apply Penalty', permission: 'orders_rent.penalty.apply' },
  NoShow: { label: 'Mark No-show', permission: 'orders_rent.no_show.mark' },
};

export default function OrderCard({ user, order, onSelect }) {
  const action = actionMatrix[order.status];
  const enabled = action ? can(user, action.permission) : false;

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => onSelect(order)} className="text-left text-lg font-semibold text-slate-950">
            {order.id}
          </button>
          <p className="mt-1 text-sm text-slate-500">{order.customerName}</p>
        </div>
        <StatusBadge value={order.status} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Rental period</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{order.rentalPeriod}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Payment</p>
          <p className="mt-2 text-sm font-medium text-slate-900">{order.deposit.toLocaleString('vi-VN')}đ / {order.remaining.toLocaleString('vi-VN')}đ</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Assigned to {order.assignedStaff}</p>
        {action ? (
          <button
            type="button"
            disabled={!enabled}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold ${enabled ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </article>
  );
}
