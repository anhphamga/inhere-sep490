import { can } from '../../utils/access-control';
import { useTranslate } from '../../hooks/useTranslate';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';

const conditionOptions = ['New', 'Used'];
const lifecycleOptions = ['Available', 'Renting', 'Washing', 'Repair'];

const conditionLabelKey = {
  New: 'admin.inventory.new',
  Used: 'admin.inventory.used',
};

export default function InventoryPage({ user }) {
  const { t } = useTranslate();
  const inventoryItems = [];
  const canCondition = can(user, 'inventory.item.update_condition');
  const canLifecycle = can(user, 'inventory.item.update_lifecycle') || can(user, 'inventory.item.update');
  const canCrud = can(user, 'inventory.item.create') || can(user, 'inventory.item.delete');

  return (
    <SectionCard eyebrow={t('admin.inventory.eyebrow')} title={t('admin.inventory.title')}>
      <div className="overflow-hidden rounded-[28px] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">{t('admin.inventory.item')}</th>
                <th className="px-5 py-4 font-semibold">{t('admin.inventory.condition')}</th>
                <th className="px-5 py-4 font-semibold">{t('admin.inventory.lifecycle')}</th>
                <th className="px-5 py-4 font-semibold">{t('admin.inventory.lastUpdate')}</th>
                <th className="px-5 py-4 font-semibold">{t('admin.inventory.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {inventoryItems.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 align-top">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <img src={item.image} alt={item.name} className="h-16 w-16 rounded-2xl object-cover" />
                      <div>
                        <p className="font-semibold text-slate-950">{item.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{item.sku} • {item.size}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <select defaultValue={item.condition} disabled={!canCondition} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 disabled:bg-slate-50 disabled:text-slate-400">
                      {conditionOptions.map((option) => <option key={option} value={option}>{t(conditionLabelKey[option], option)}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="mb-3"><StatusBadge value={item.lifecycleStatus} /></div>
                    <select defaultValue={item.lifecycleStatus} disabled={!canLifecycle} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 disabled:bg-slate-50 disabled:text-slate-400">
                      {lifecycleOptions.map((option) => <option key={option} value={option}>{t(`status.${option.charAt(0).toLowerCase()}${option.slice(1)}`, option)}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{item.updatedAt}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={`rounded-2xl px-4 py-2 font-semibold ${canCondition || canLifecycle ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`} disabled={!(canCondition || canLifecycle)}>{t('common.save')}</button>
                      <button type="button" className={`rounded-2xl border px-4 py-2 font-semibold ${canCrud ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-300'}`} disabled={!canCrud}>{t('common.delete')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

