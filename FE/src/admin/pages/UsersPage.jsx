import { useState } from 'react';
import SectionCard from '../components/SectionCard';
import { mockUsers } from '../mockData';

export default function UsersPage() {
  const [roleFilter, setRoleFilter] = useState('all');

  const users = mockUsers.filter((user) => roleFilter === 'all' ? true : user.role === roleFilter);

  return (
    <SectionCard eyebrow="Owner controls" title="Users">
      <div className="mb-5 flex justify-end">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-11 rounded-2xl border border-slate-200 bg-white px-4">
          <option value="all">All roles</option>
          <option value="owner">Owner</option>
          <option value="staff">Staff</option>
          <option value="customer">Customer</option>
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
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{user.role}</span>
              <button type="button" className={`rounded-2xl px-4 py-2 font-semibold ${user.status === 'locked' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                {user.status === 'locked' ? 'Unlock' : 'Lock'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
