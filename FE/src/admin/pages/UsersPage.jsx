import { useState } from 'react';
import SectionCard from '../components/SectionCard';
import { useTranslate } from '../../hooks/useTranslate';
import StatusBadge from '../components/StatusBadge';

export default function UsersPage() {
  const { t } = useTranslate();
  const [roleFilter, setRoleFilter] = useState('all');
  const [usersData] = useState([]);

  const users = usersData.filter((user) => roleFilter === 'all' ? true : user.role === roleFilter);

  return (
    <SectionCard eyebrow={t('admin.users.eyebrow')} title={t('admin.users.title')}>
      <div className="mb-5 flex justify-end">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4">
          <option value="all">{t('admin.users.allRoles')}</option>
          <option value="owner">{t('admin.users.owner')}</option>
          <option value="staff">{t('admin.users.staff')}</option>
          <option value="customer">{t('admin.users.customer')}</option>
        </select>
      </div>
      <div className="grid gap-4">
        {users.map((user) => (
          <div key={user.id} className="flex flex-col justify-between gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:flex-row md:items-center">
            <div>
              <p className="text-lg font-semibold text-slate-950">{user.name}</p>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge value={user.role === 'owner' ? 'Active' : user.status === 'locked' ? 'Inactive' : 'Active'} />
              <button type="button" className={`rounded-2xl px-4 py-2 font-semibold ${user.status === 'locked' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                {user.status === 'locked' ? t('admin.users.unlock') : t('admin.users.lock')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

