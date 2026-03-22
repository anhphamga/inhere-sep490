import { can } from '../../utils/access-control';
import { mockInventory } from '../mockData';
import SectionCard from '../components/SectionCard';
import StatusBadge from '../components/StatusBadge';

const conditionOptions = ['New', 'Good', 'Used', 'Damaged'];
const lifecycleOptions = ['Available', 'Renting', 'Washing', 'Repair'];

export default function InventoryPage({ user }) {
  const canCondition = can(user, 'inventory.item.update_condition');
  const canLifecycle = can(user, 'inventory.item.update_lifecycle') || can(user, 'inventory.item.update');
  const canCrud = can(user, 'inventory.item.create') || can(user, 'inventory.item.delete');

  return (
    <SectionCard eyebrow="Inventory" title="Product instances">
      <div className="overflow-hidden rounded-[28px] border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Item</th>
                <th className="px-5 py-4 font-semibold">Condition</th>
                <th className="px-5 py-4 font-semibold">Lifecycle</th>
                <th className="px-5 py-4 font-semibold">Last update</th>
                <th className="px-5 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockInventory.map((item) => (
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
                      {conditionOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="mb-3"><StatusBadge value={item.lifecycleStatus} /></div>
                    <select defaultValue={item.lifecycleStatus} disabled={!canLifecycle} className="h-11 rounded-2xl border border-slate-200 bg-white px-4 disabled:bg-slate-50 disabled:text-slate-400">
                      {lifecycleOptions.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{item.updatedAt}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className={`rounded-2xl px-4 py-2 font-semibold ${canCondition || canLifecycle ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`} disabled={!(canCondition || canLifecycle)}>Save</button>
                      <button type="button" className={`rounded-2xl border px-4 py-2 font-semibold ${canCrud ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-300'}`} disabled={!canCrud}>Delete</button>
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
