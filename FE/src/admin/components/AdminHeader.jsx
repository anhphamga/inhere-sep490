import { Search, ChevronDown, Bell } from 'lucide-react';
import { useTranslate } from '../../hooks/useTranslate';

export default function AdminHeader({ title, user, search, onSearchChange }) {
  const { t } = useTranslate();

  return (
    <header className="sticky top-0 z-20 border-b border-white/70 bg-[linear-gradient(180deg,rgba(250,248,243,0.94),rgba(250,248,243,0.78))] backdrop-blur-xl">
      <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t('header.controlCenter')}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h1>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block min-w-[260px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-700 outline-none ring-0 transition focus:border-slate-900"
            />
          </label>
          <button type="button" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:text-slate-950">
            <Bell className="h-4 w-4" />
          </button>
          <button type="button" className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-slate-300">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
              {String(user?.name || 'I').charAt(0)}
            </span>
            <span className="hidden sm:block">
              <span className="block text-sm font-semibold text-slate-950">{user?.name || t('common.appName')}</span>
              <span className="block text-xs uppercase tracking-[0.2em] text-slate-400">{user?.role || 'staff'}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
