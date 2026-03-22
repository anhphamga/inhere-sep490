import { can } from '../../utils/access-control';
import StatusBadge from './StatusBadge';

const actionMatrix = [
  { status: 'Deposited', label: 'Confirm Order', permission: 'orders_rent.order.confirm' },
  { status: 'Confirmed', label: 'Pickup', permission: 'orders_rent.pickup.complete' },
  { status: 'Renting', label: 'Process Return', permission: 'orders_rent.return.process' },
  { status: 'Late', label: 'Apply Penalty', permission: 'orders_rent.penalty.apply' },
  { status: 'NoShow', label: 'Mark No-show', permission: 'orders_rent.no_show.mark' },
];

export default function OrderTable({ user, orders, onSelect }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-semibold">Order</th>
              <th className="px-5 py-4 font-semibold">Customer</th>
              <th className="px-5 py-4 font-semibold">Rental Period</th>
              <th className="px-5 py-4 font-semibold">Deposit / Remaining</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 font-semibold">Assigned Staff</th>
              <th className="px-5 py-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const action = actionMatrix.find((item) => item.status === order.status);
              const enabled = action ? can(user, action.permission) : false;
              return (
                <tr key={order.id} className="border-t border-slate-100 text-slate-700 transition hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <button type="button" onClick={() => onSelect(order)} className="font-semibold text-slate-950 transition hover:text-slate-700">
                      {order.id}
                    </button>
                    <p className="mt-1 text-xs text-slate-400">{order.items} items</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-950">{order.customerName}</p>
                    <p className="mt-1 text-xs text-slate-400">{order.customerPhone}</p>
                  </td>
                  <td className="px-5 py-4">{order.rentalPeriod}</td>
                  <td className="px-5 py-4">
                    <p>{order.deposit.toLocaleString('vi-VN')}đ</p>
                    <p className="mt-1 text-xs text-slate-400">{order.remaining.toLocaleString('vi-VN')}đ remaining</p>
                  </td>
                  <td className="px-5 py-4"><StatusBadge value={order.status} /></td>
                  <td className="px-5 py-4">{order.assignedStaff}</td>
                  <td className="px-5 py-4">
                    {action ? (
                      <button
                        type="button"
                        disabled={!enabled}
                        className={`rounded-2xl px-4 py-2 font-semibold transition ${enabled ? 'bg-slate-900 text-white hover:bg-slate-700' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}
                      >
                        {action.label}
                      </button>
                    ) : (
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-300">No action</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
