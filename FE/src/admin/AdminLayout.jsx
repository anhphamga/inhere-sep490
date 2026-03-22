import { useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AdminHeader from './components/AdminHeader';
import { PAGE_TITLES } from './config';
import { mockCurrentUserByRole } from './mockData';
import { useAuth } from '../contexts/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');

  const resolvedUser = useMemo(() => {
    if (user?.permissions?.length || user?.access?.permissions?.length) return user;
    return mockCurrentUserByRole[user?.role] || user;
  }, [user]);

  if (!['owner', 'staff', 'manager'].includes(resolvedUser?.role)) {
    return <Navigate to="/" replace />;
  }

  const title = PAGE_TITLES[location.pathname] || 'Admin Dashboard';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f6efe1,transparent_26%),radial-gradient(circle_at_top_right,#eef4ff,transparent_24%),linear-gradient(180deg,#f8f4ec,#f8fafc)] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar user={resolvedUser} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader title={title} user={resolvedUser} search={headerSearch} onSearchChange={setHeaderSearch} />
          <main className="flex-1 px-5 py-6 lg:px-8">
            <Outlet context={{ user: resolvedUser, headerSearch }} />
          </main>
        </div>
      </div>
    </div>
  );
}
