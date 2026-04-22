import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Check,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquareText,
  PanelLeft,
  PanelRight,
  ReceiptText,
  BarChart3,
  Search,
  Settings,
  Shirt,
  Users,
  Package,
  Folder,
} from 'lucide-react'
import { cn } from '../../utils/ui.utils'
import { useAuth } from '../../contexts/AuthContext'
import { useTranslate } from '../../hooks/useTranslate'
import '../../style/features/owner/owner.css'

const navItems = [
  { to: '/owner/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { to: '/owner/users', labelKey: 'sidebar.users', icon: Users },
  { to: '/owner/products', labelKey: 'sidebar.products', icon: Shirt },
  { to: '/owner/categories', labelKey: 'sidebar.categories', icon: Folder },
  { to: '/owner/inventory', labelKey: 'sidebar.inventory', icon: Package },
  { to: '/owner/staff', labelKey: 'sidebar.staff', icon: BadgeCheck },
  { to: '/owner/orders', labelKey: 'sidebar.orders', icon: ReceiptText },
  { to: '/owner/rent-orders', label: 'Quản lý đơn thuê', icon: Package },
  { to: '/owner/blogs', label: 'Quản lý blog', icon: MessageSquareText },
  { to: '/owner/reviews', label: 'Quản lý đánh giá', icon: MessageSquareText },
  { to: '/owner/promotions', labelKey: 'sidebar.vouchers', icon: Megaphone },
  { to: '/owner/damage-policies', label: 'Chính sách hư hỏng', icon: Settings },
  { to: '/owner/reports', labelKey: 'sidebar.analytics', icon: BarChart3 },
]

const pageTitleMap = {
  dashboard: 'pageTitles.adminDashboard',
  users: 'pageTitles.users',
  products: 'pageTitles.products',
  categories: 'pageTitles.categories',
  inventory: 'pageTitles.inventory',
  staff: 'pageTitles.staffManagement',
  'staff-analytics': 'pageTitles.staffAnalytics',
  orders: 'pageTitles.rentOrders',
  'rent-orders': 'Quan ly don thue',
  blogs: 'Quan ly blog',
  promotions: 'pageTitles.vouchers',
  reviews: 'pageTitles.reviews',
  alerts: 'pageTitles.alerts',
  reports: 'pageTitles.analytics',
  analytics: 'pageTitles.analytics',
  vouchers: 'pageTitles.vouchers',
  'damage-policies': 'Chính sách hư hỏng',
}

const colorOptions = [
  { value: 'teal', labelKey: 'owner.settings.teal', hex: '#0d9488' },
  { value: 'white', labelKey: 'owner.settings.white', hex: '#f8fafc' },
  { value: 'blue', labelKey: 'owner.settings.blue', hex: '#2563eb' },
]

const layoutOptions = ['lithium', 'helium', 'hydrogen', 'carbon', 'boron', 'beryllium']

const OwnerLayout = () => {
  const { t } = useTranslate()
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [appearance, setAppearance] = useState(() => localStorage.getItem('owner_appearance') || 'light')
  const [direction, setDirection] = useState(() => localStorage.getItem('owner_direction') || 'ltr')
  const [layoutMode, setLayoutMode] = useState('hydrogen')
  const [accentColor, setAccentColor] = useState('blue')
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false)
  const [ownerSearchValue, setOwnerSearchValue] = useState('')

  const handleLogout = async () => {
    if (confirm(t('owner.confirmLogout'))) {
      await logout()
      navigate('/work/login?role=owner')
    }
  }

  const pathParts = location.pathname.split('/').filter(Boolean)
  const currentSegment = pathParts[1] || 'dashboard'
  const isUsersScreen = currentSegment === 'users'
  const isStaffScreen = currentSegment === 'staff'
  const isProductsListScreen = currentSegment === 'products' && pathParts.length === 2
  const isUserDetail = currentSegment === 'users' && pathParts.length > 2
  const isProductDetail = currentSegment === 'products' && pathParts.length > 2
  const isStaffSubView = currentSegment === 'staff-analytics'
  const showBackButton = isUserDetail || isProductDetail || isStaffSubView

  let title = currentSegment === 'reviews'
    ? 'Quản lý đánh giá'
    : t(pageTitleMap[currentSegment], t('pageTitles.owner'))
  if (isUserDetail) title = t('pageTitles.userDetail')
  if (isProductDetail) title = t('pageTitles.productDetail')

  const searchParams = new URLSearchParams(location.search)
  const productsSearchValue = searchParams.get('q') || ''

  const selectedAccentHex = useMemo(() => {
    return colorOptions.find((item) => item.value === accentColor)?.hex || '#2563eb'
  }, [accentColor])

  useEffect(() => {
    localStorage.setItem('owner_direction', direction)
    document.documentElement.setAttribute('dir', direction)
    return () => {
      document.documentElement.setAttribute('dir', 'ltr')
    }
  }, [direction])

  useEffect(() => {
    localStorage.setItem('owner_appearance', appearance)
    document.documentElement.setAttribute('data-owner-theme', appearance)
    return () => {
      document.documentElement.removeAttribute('data-owner-theme')
    }
  }, [appearance])

  const handleProductsSearchChange = (value) => {
    const nextParams = new URLSearchParams(location.search)
    if (value.trim()) nextParams.set('q', value)
    else nextParams.delete('q')

    navigate(
      {
        pathname: location.pathname,
        search: nextParams.toString() ? `?${nextParams.toString()}` : '',
      },
      { replace: true }
    )
  }

  return (
    <div
      className={cn('flex min-h-screen font-sans text-slate-900 owner-theme-root', appearance === 'dark' ? 'owner-theme-dark' : 'owner-theme-light')}
      style={{ '--owner-accent': selectedAccentHex }}
    >
      <aside className={cn('fixed top-0 z-50 flex h-screen w-64 flex-col overflow-hidden border-slate-200 bg-white', direction === 'rtl' ? 'right-0 border-l' : 'left-0 border-r')}>
        <Link to="/owner/dashboard" className="flex items-center gap-3 p-6 transition-opacity hover:opacity-90">
          <div className="rounded-lg bg-[#1975d2] p-2">
            <Shirt className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">{t('sidebar.ownerDashboard')}</span>
        </Link>

        <nav className="owner-sidebar-scroll mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  'group flex w-full items-center gap-3 rounded-lg px-3 py-3 font-medium transition-all',
                  isActive
                    ? direction === 'rtl'
                      ? 'border-l-4 border-[#1975d2] bg-[#1975d2]/10 text-[#1975d2]'
                      : 'border-r-4 border-[#1975d2] bg-[#1975d2]/10 text-[#1975d2]'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Icon className="h-5 w-5 shrink-0 text-current" />
                <span>{item.label || t(item.labelKey)}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="relative border-t border-slate-200 p-4">
          <button
            type="button"
            className="w-full rounded-lg p-2 text-left transition-colors hover:bg-slate-50"
            onClick={() => setOwnerMenuOpen((prev) => !prev)}
          >
            <div className="flex items-center gap-3">
              <img src="https://i.pravatar.cc/150?u=admin" alt="Admin" className="h-10 w-10 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t('sidebar.ownerRole')}</p>
                <p className="truncate text-xs text-slate-500">{t('owner.systemOwner')}</p>
              </div>
            </div>
          </button>

          {ownerMenuOpen ? (
            <div className="absolute bottom-16 left-4 right-4 z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                onClick={() => {
                  localStorage.removeItem('accessToken')
                  localStorage.removeItem('refreshToken')
                  navigate('/work/login?role=owner')
                }}
              >
                {t('common.logout')}
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      <main className={cn('flex min-h-screen flex-1 flex-col', direction === 'rtl' ? 'mr-64' : 'ml-64')}>
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="flex items-center gap-4">
            {showBackButton ? (
              <button
                onClick={() => {
                  if (isUserDetail) navigate('/owner/users')
                  else if (isProductDetail) navigate('/owner/products')
                  else if (isStaffSubView) navigate('/owner/staff')
                }}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-[#1975d2]"
              >
                <ChevronRight className={cn('h-5 w-5', direction === 'rtl' ? '' : 'rotate-180')} />
              </button>
            ) : null}
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          </div>

          <div className="flex items-center gap-6">
            {!isUsersScreen && !isStaffScreen ? (
              <div className="relative w-96">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                {isProductsListScreen ? (
                  <input
                    type="text"
                    value={productsSearchValue}
                    onChange={(event) => handleProductsSearchChange(event.target.value)}
                    placeholder={t('header.searchOwnerProducts')}
                    className="w-full rounded-lg border-none bg-slate-100 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/50"
                  />
                ) : (
                  <input
                    type="text"
                    value={ownerSearchValue}
                    onChange={(event) => setOwnerSearchValue(event.target.value)}
                    placeholder={t('header.searchOwnerGeneral')}
                    className="w-full rounded-lg border-none bg-slate-100 py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#1975d2]/50"
                  />
                )}
              </div>
            ) : null}
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-100"
                onClick={handleLogout}
                title={t('common.logout')}
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1">
          <div className="p-8">
            <Outlet />
          </div>
        </div>

        <footer className="p-8 text-center text-xs text-slate-400">
          {t('owner.footer')}
        </footer>
      </main>

      {settingsOpen ? (
        <>
          <div className="owner-settings-overlay" onClick={() => setSettingsOpen(false)} />
          <aside className={cn('owner-settings-drawer', appearance === 'dark' ? 'owner-settings-dark' : 'owner-settings-light')}>
            <div className="owner-settings-head">
              <button type="button" className="owner-settings-close" onClick={() => setSettingsOpen(false)}>&times;</button>
              <h3>{t('owner.settings.title')}</h3>
            </div>

            <div className="owner-settings-body">
              <section className="owner-settings-section">
                <p className="owner-settings-title">{t('owner.settings.appearance')}</p>
                <div className="owner-settings-grid owner-settings-grid-2">
                  <button type="button" className={cn('owner-settings-choice', appearance === 'dark' && 'active')} onClick={() => setAppearance('dark')}>
                    <span className="owner-settings-preview owner-settings-preview-dark" />
                    <strong>{t('owner.settings.dark')}</strong>
                  </button>
                  <button type="button" className={cn('owner-settings-choice', appearance === 'light' && 'active')} onClick={() => setAppearance('light')}>
                    <span className="owner-settings-preview owner-settings-preview-light" />
                    <strong>{t('owner.settings.light')}</strong>
                  </button>
                </div>
              </section>

              <section className="owner-settings-section">
                <p className="owner-settings-title">{t('owner.settings.direction')}</p>
                <div className="owner-settings-grid owner-settings-grid-2">
                  <button type="button" className={cn('owner-settings-choice owner-settings-choice-row', direction === 'rtl' && 'active')} onClick={() => setDirection('rtl')}>
                    <span className="inline-flex items-center gap-2"><strong>RTL</strong><PanelRight className="h-4 w-4 text-slate-400" /></span>
                  </button>
                  <button type="button" className={cn('owner-settings-choice owner-settings-choice-row', direction === 'ltr' && 'active')} onClick={() => setDirection('ltr')}>
                    <span className="inline-flex items-center gap-2"><PanelLeft className="h-4 w-4 text-slate-400" /><strong>LTR</strong></span>
                  </button>
                </div>
              </section>

              <section className="owner-settings-section">
                <p className="owner-settings-title">{t('owner.settings.layout')}</p>
                <div className="owner-settings-grid owner-settings-grid-3">
                  {layoutOptions.map((option) => (
                    <button key={option} type="button" className={cn('owner-settings-choice', layoutMode === option && 'active')} onClick={() => setLayoutMode(option)}>
                      <span className="owner-settings-layout" />
                      <strong>{option.charAt(0).toUpperCase() + option.slice(1)}</strong>
                    </button>
                  ))}
                </div>
              </section>

              <section className="owner-settings-section">
                <p className="owner-settings-title">{t('owner.settings.colors')}</p>
                <div className="owner-settings-grid owner-settings-grid-3">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={cn('owner-settings-color', accentColor === option.value && 'active')}
                      onClick={() => setAccentColor(option.value)}
                      style={{ backgroundColor: option.hex }}
                    >
                      {accentColor === option.value ? <Check className="h-4 w-4" /> : null}
                      <span>{t(option.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  )
}

export default OwnerLayout
