import { useDeferredValue, useMemo, useState } from 'react';
import { CalendarDays, LayoutGrid, ListFilter, Rows3, Search } from 'lucide-react';
import { useTranslate } from '../../hooks/useTranslate';
import SectionCard from '../components/SectionCard';
import OrderTable from '../components/OrderTable';
import OrderCard from '../components/OrderCard';
import StatusBadge from '../components/StatusBadge';
import { ORDER_STATUS_OPTIONS } from '../config';

const statusKeyMap = {
  All: 'common.all',
  PendingDeposit: 'status.pendingDeposit',
  Deposited: 'status.deposited',
  Confirmed: 'status.confirmed',
  Renting: 'status.renting',
  Returned: 'status.returned',
  Late: 'status.late',
  NoShow: 'status.noShow',
};

export default function RentOrdersPage({ user }) {
  const { t } = useTranslate();
  const [view, setView] = useState('table');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [orders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const deferredSearch = useDeferredValue(search);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = status === 'All' ? true : order.status === status;
      const matchesSearch = deferredSearch
        ? order.id.toLowerCase().includes(deferredSearch.toLowerCase())
        : true;
      const matchesFrom = fromDate ? order.rentStartDate >= fromDate : true;
      const matchesTo = toDate ? order.rentEndDate <= toDate : true;
      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });
  }, [deferredSearch, fromDate, orders, status, toDate]);

  return (
    <div className="space-y-6">
      <SectionCard eyebrow={t('admin.rentOrders.eyebrow')} title={t('admin.rentOrders.title')}>
        <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr_0.7fr_0.7fr_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.rentOrders.searchByOrderId')} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-slate-900" />
          </label>
          <label className="relative">
            <ListFilter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-slate-900">
              {ORDER_STATUS_OPTIONS.map((item) => <option key={item} value={item}>{t(statusKeyMap[item] || '', item)}</option>)}
            </select>
          </label>
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-slate-900" />
          </label>
          <label className="relative">
            <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-slate-900" />
          </label>
          <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1">
            <button type="button" onClick={() => setView('table')} className={`inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
              <Rows3 className="h-4 w-4" /> {t('admin.rentOrders.table')}
            </button>
            <button type="button" onClick={() => setView('cards')} className={`inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold ${view === 'cards' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
              <LayoutGrid className="h-4 w-4" /> {t('admin.rentOrders.cards')}
            </button>
          </div>
        </div>
      </SectionCard>

      {view === 'table' ? (
        <OrderTable user={user} orders={filteredOrders} onSelect={setSelectedOrder} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredOrders.map((order) => <OrderCard key={order.id} user={user} order={order} onSelect={setSelectedOrder} />)}
        </div>
      )}

      {selectedOrder ? (
        <SectionCard eyebrow={t('admin.rentOrders.selectedOrder')} title={selectedOrder.id}>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t('admin.rentOrders.customer')}</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{selectedOrder.customerName}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedOrder.customerPhone}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedOrder.customerEmail}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t('admin.rentOrders.rentalPeriod')}</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{selectedOrder.rentalPeriod}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedOrder.items} {t('admin.rentOrders.wardrobePieces')}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t('admin.rentOrders.assignedStaff')}</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">{selectedOrder.assignedStaff}</p>
              <p className="mt-1 text-sm text-slate-500">{t('admin.rentOrders.remaining')}: {selectedOrder.remaining.toLocaleString('vi-VN')}đ</p>
              <div className="mt-3"><StatusBadge value={selectedOrder.status} /></div>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}

