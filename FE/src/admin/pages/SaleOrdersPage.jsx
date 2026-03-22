import SectionCard from '../components/SectionCard';
import { mockSaleOrders } from '../mockData';

export default function SaleOrdersPage() {
  return (
    <SectionCard eyebrow="Commerce" title="Sale orders">
      <div className="grid gap-4">
        {mockSaleOrders.map((order) => (
          <div key={order.id} className="flex flex-col justify-between gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold text-slate-950">{order.id}</p>
              <p className="mt-1 text-sm text-slate-500">{order.customer} • {order.channel}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-lg font-semibold text-slate-950">{order.total.toLocaleString('vi-VN')}đ</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{order.status}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
