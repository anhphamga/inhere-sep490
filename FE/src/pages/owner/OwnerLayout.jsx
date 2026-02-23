import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
    BadgeCheck,
    Bell,
    Check,
    ChevronRight,
    CreditCard,
    LayoutDashboard,
    Megaphone,
    PanelLeft,
    PanelRight,
    ReceiptText,
    BarChart3,
    Search,
    Settings,
    Shirt,
    Users
} from 'lucide-react'
import { cn } from '../lib/utils'
import './owner.css'

const navItems = [
    { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/owner/users', label: 'Users', icon: Users },
    { to: '/owner/products', label: 'Products', icon: Shirt },
    { to: '/owner/staff', label: 'Staff', icon: BadgeCheck },
    { to: '/owner/orders', label: 'Orders', icon: ReceiptText },
    { to: '/owner/promotions', label: 'Promotions', icon: Megaphone },
    { to: '/owner/membership', label: 'Membership', icon: CreditCard },
    { to: '/owner/alerts', label: 'Alerts', icon: Bell },
    { to: '/owner/reports', label: 'Reports', icon: BarChart3 }
]

const pageTitleMap = {
    dashboard: 'Dashboard',
    users: 'Users',
    products: 'Products',
    staff: 'Staff',
    'staff-calendar': 'Staff Calendar',
    'staff-analytics': 'Staff Analytics',
    orders: 'Orders',
    promotions: 'Promotions',
    membership: 'Membership',
    alerts: 'Alerts',
    reports: 'Reports',
    analytics: 'Reports',
    shifts: 'Staff Calendar',
    vouchers: 'Promotions'
}

const colorOptions = [
    { value: 'teal', label: 'Teal', hex: '#0d9488' },
    { value: 'white', label: 'White', hex: '#f8fafc' },
    { value: 'blue', label: 'Blue', hex: '#2563eb' }
]

const layoutOptions = ['lithium', 'helium', 'hydrogen', 'carbon', 'boron', 'beryllium']

const OwnerLayout = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [appearance, setAppearance] = useState(() => localStorage.getItem('owner_appearance') || 'light')
    const [direction, setDirection] = useState(() => localStorage.getItem('owner_direction') || 'ltr')
    const [layoutMode, setLayoutMode] = useState('hydrogen')
    const [accentColor, setAccentColor] = useState('blue')
    const [ownerMenuOpen, setOwnerMenuOpen] = useState(false)

    const pathParts = location.pathname.split('/').filter(Boolean)
    const currentSegment = pathParts[1] || 'dashboard'
    const isUsersScreen = currentSegment === 'users'
    const isStaffScreen = currentSegment === 'staff'
    const isProductsListScreen = currentSegment === 'products' && pathParts.length === 2
    const isUserDetail = currentSegment === 'users' && pathParts.length > 2
    const isProductDetail = currentSegment === 'products' && pathParts.length > 2
    const isStaffSubView = currentSegment === 'staff-calendar' || currentSegment === 'staff-analytics'
    const showBackButton = isUserDetail || isProductDetail || isStaffSubView

    let title = pageTitleMap[currentSegment] || 'Owner'
    if (isUserDetail) {
        title = 'User Detail'
    }
    if (isProductDetail) {
        title = 'Product Detail'
    }

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

        if (value.trim()) {
            nextParams.set('q', value)
        } else {
            nextParams.delete('q')
        }

        navigate(
            {
                pathname: location.pathname,
                search: nextParams.toString() ? `?${nextParams.toString()}` : ''
            },
            { replace: true }
        )
    }

    return (
        <div
            className={cn('flex min-h-screen font-sans text-slate-900 owner-theme-root', appearance === 'dark' ? 'owner-theme-dark' : 'owner-theme-light')}
            style={{ '--owner-accent': selectedAccentHex }}
        >
            <aside className={cn(
                'fixed top-0 h-full w-64 bg-white border-slate-200 flex flex-col z-50',
                direction === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'
            )}>
                <Link to="/" className="p-6 flex items-center gap-3 hover:opacity-90 transition-opacity">
                    <div className="bg-[#1975d2] p-2 rounded-lg">
                        <Shirt className="text-white w-6 h-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">Owner Dasboard</span>
                </Link>

                <nav className="flex-1 px-4 space-y-1 mt-4">
                    {navItems.map((item) => {
                        const Icon = item.icon

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => cn(
                                    'w-full flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-all group',
                                    isActive
                                        ? direction === 'rtl'
                                            ? 'bg-[#1975d2]/10 text-[#1975d2] border-l-4 border-[#1975d2]'
                                            : 'bg-[#1975d2]/10 text-[#1975d2] border-r-4 border-[#1975d2]'
                                        : 'text-slate-600 hover:bg-slate-50'
                                )}
                            >
                                <Icon className="w-5 h-5 shrink-0 text-current" />
                                <span>{item.label}</span>
                            </NavLink>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200 relative">
                    <button
                        type="button"
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
                        onClick={() => setOwnerMenuOpen((prev) => !prev)}
                    >
                        <img
                            src="https://i.pravatar.cc/150?u=admin"
                            alt="Admin"
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">Owner</p>
                            <p className="text-xs text-slate-500 truncate">System Owner</p>
                        </div>
                    </button>

                    {ownerMenuOpen ? (
                        <div className="absolute left-4 right-4 bottom-16 bg-white border border-slate-200 rounded-lg shadow-md z-20 overflow-hidden">
                            <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={() => {
                                    localStorage.removeItem('token')
                                    localStorage.removeItem('accessToken')
                                    localStorage.removeItem('refreshToken')
                                    navigate('/login')
                                }}
                            >
                                Logout
                            </button>
                        </div>
                    ) : null}
                </div>
            </aside>

            <main className={cn('flex-1 min-h-screen flex flex-col', direction === 'rtl' ? 'mr-64' : 'ml-64')}>
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        {showBackButton ? (
                            <button
                                onClick={() => {
                                    if (isUserDetail) {
                                        navigate('/owner/users')
                                    } else if (isProductDetail) {
                                        navigate('/owner/products')
                                    } else if (isStaffSubView) {
                                        navigate('/owner/staff')
                                    }
                                }}
                                className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-[#1975d2] transition-colors"
                            >
                                <ChevronRight className={cn('w-5 h-5', direction === 'rtl' ? '' : 'rotate-180')} />
                            </button>
                        ) : null}
                        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {!isUsersScreen && !isStaffScreen ? (
                            <div className="relative w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                {isProductsListScreen ? (
                                    <input
                                        type="text"
                                        value={productsSearchValue}
                                        onChange={(event) => handleProductsSearchChange(event.target.value)}
                                        placeholder="Search products..."
                                        className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 text-sm outline-none"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Search users, products or orders..."
                                        className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-[#1975d2]/50 text-sm outline-none"
                                    />
                                )}
                            </div>
                        ) : null}
                        <div className="flex items-center gap-4">
                            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                            </button>
                            <button
                                type="button"
                                className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
                                onClick={() => setSettingsOpen(true)}
                            >
                                <Settings className="w-5 h-5" />
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
                    © 2026 INHERE – Hoi An Traditional Clothing Sales and Rental Management System
                </footer>
            </main>

            {settingsOpen ? (
                <>
                    <div
                        className="owner-settings-overlay"
                        onClick={() => setSettingsOpen(false)}
                    />
                    <aside
                        className={cn('owner-settings-drawer', appearance === 'dark' ? 'owner-settings-dark' : 'owner-settings-light')}
                    >
                        <div className="owner-settings-head">
                            <button type="button" className="owner-settings-close" onClick={() => setSettingsOpen(false)}>×</button>
                            <h3>Settings</h3>
                        </div>

                        <div className="owner-settings-body">
                            <section className="owner-settings-section">
                                <p className="owner-settings-title">Appearance</p>
                                <div className="owner-settings-grid owner-settings-grid-2">
                                    <button
                                        type="button"
                                        className={cn('owner-settings-choice', appearance === 'dark' && 'active')}
                                        onClick={() => setAppearance('dark')}
                                    >
                                        <span className="owner-settings-preview owner-settings-preview-dark" />
                                        <strong>Dark</strong>
                                    </button>
                                    <button
                                        type="button"
                                        className={cn('owner-settings-choice', appearance === 'light' && 'active')}
                                        onClick={() => setAppearance('light')}
                                    >
                                        <span className="owner-settings-preview owner-settings-preview-light" />
                                        <strong>Light</strong>
                                    </button>
                                </div>
                            </section>

                            <section className="owner-settings-section">
                                <p className="owner-settings-title">Direction</p>
                                <div className="owner-settings-grid owner-settings-grid-2">
                                    <button
                                        type="button"
                                        className={cn('owner-settings-choice owner-settings-choice-row', direction === 'rtl' && 'active')}
                                        onClick={() => setDirection('rtl')}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <strong>RTL</strong>
                                            <PanelRight className="w-4 h-4 text-slate-400" />
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className={cn('owner-settings-choice owner-settings-choice-row', direction === 'ltr' && 'active')}
                                        onClick={() => setDirection('ltr')}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <PanelLeft className="w-4 h-4 text-slate-400" />
                                            <strong>LTR</strong>
                                        </span>
                                    </button>
                                </div>
                            </section>

                            <section className="owner-settings-section">
                                <p className="owner-settings-title">Layout</p>
                                <div className="owner-settings-grid owner-settings-grid-3">
                                    {layoutOptions.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            className={cn('owner-settings-choice', layoutMode === option && 'active')}
                                            onClick={() => setLayoutMode(option)}
                                        >
                                            <span className="owner-settings-layout" />
                                            <strong>{option.charAt(0).toUpperCase() + option.slice(1)}</strong>
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section className="owner-settings-section">
                                <p className="owner-settings-title">Colors</p>
                                <div className="owner-settings-grid owner-settings-grid-3">
                                    {colorOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            className={cn('owner-settings-color', accentColor === option.value && 'active')}
                                            onClick={() => setAccentColor(option.value)}
                                            style={{ backgroundColor: option.hex }}
                                        >
                                            {accentColor === option.value ? <Check className="w-4 h-4" /> : null}
                                            <span>{option.label}</span>
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
