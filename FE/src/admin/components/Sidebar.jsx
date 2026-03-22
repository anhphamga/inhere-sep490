import { Link, NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react';
import { ADMIN_NAV_GROUPS } from '../config';
import { can } from '../../utils/access-control';

const itemVisible = (user, item) => {
  if (item.roles && !item.roles.includes(user?.role)) return false;
  if (item.permission && !can(user, item.permission)) return false;
  return true;
};

export default function Sidebar({ user, collapsed, onToggle }) {
  return (
    <aside className={`relative flex h-full flex-col border-r border-slate-200/70 bg-[linear-gradient(180deg,#fffdf8,rgba(255,255,255,0.96))] transition-all duration-300 ${collapsed ? 'w-[92px]' : 'w-[280px]'}`}>
      <div className="flex items-center justify-between px-5 py-5">
        <Link to="/admin/dashboard" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#475569)] text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </div>
          {!collapsed ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">INHERE</p>
              <p className="text-lg font-semibold text-slate-950">Admin Suite</p>
            </div>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <div className="px-4 pb-6">
        <div className="rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(148,163,184,0.06))] p-4">
          {!collapsed ? (
            <>
              <p className="text-sm font-semibold text-slate-900">{user?.name || 'INHERE Admin'}</p>
              <p className="mt-1 text-sm text-slate-500">{String(user?.role || 'staff').toUpperCase()}</p>
            </>
          ) : (
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
              {String(user?.name || 'I').charAt(0)}
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {ADMIN_NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => itemVisible(user, item));
          if (items.length === 0) return null;

          return (
            <div key={group.id}>
              {!collapsed ? (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">{group.label}</p>
              ) : null}
              <div className="mt-3 space-y-1.5">
                {items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) => `group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]'
                        : 'text-slate-600 hover:bg-white hover:text-slate-950'
                    }`}
                  >
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black/5 transition">
                      <Icon className="h-4 w-4" />
                    </span>
                    {!collapsed ? <span>{label}</span> : null}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
