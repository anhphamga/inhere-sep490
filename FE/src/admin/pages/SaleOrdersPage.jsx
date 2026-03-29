import SectionCard from '../components/SectionCard';
import { useTranslate } from '../../hooks/useTranslate';
import StatusBadge from '../components/StatusBadge';

export default function SaleOrdersPage() {
  const { t } = useTranslate();
  const saleOrders = [];

  return (
    <SectionCard eyebrow={t('admin.saleOrders.eyebrow')} title={t('admin.saleOrders.title')}>
      <div className="grid gap-4">
        {saleOrders.map((order) => (
          <div key={order.id} className="flex flex-col justify-between gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold text-slate-950">{order.id}</p>
              <p className="mt-1 text-sm text-slate-500">{order.customer} • {order.channel}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-lg font-semibold text-slate-950">{order.total.toLocaleString('vi-VN')}đ</p>
              <StatusBadge value={order.status} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

