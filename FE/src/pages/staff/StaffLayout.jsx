import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const formatDate = (date) => {
  const d = new Date(date)
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function StaffLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [currentTime, setCurrentTime] = useState(new Date())
  const [notificationOpen, setNotificationOpen] = useState(false)
  const notificationRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationOpen(false)
      }
    }
    if (notificationOpen) {
      document.addEventListener('click', handleClickOutside)
    }
    return () => document.removeEventListener('click', handleClickOutside)
  }, [notificationOpen])

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const sidebarMenu = [
    { to: '/staff', label: 'Dashboard', icon: '📊' },
    { to: '/staff/rent-orders', label: 'Quản lý đơn thuê', icon: '📋' },
    { to: '/staff/rent-order', label: 'Tạo đơn thuê', icon: '➕' },
    { to: '/staff/sale-order', label: 'Tạo đơn bán', icon: '🛒' },
    { to: '/staff/fitting', label: 'Lịch thử đồ', icon: '👗' },
    { to: '/staff/return', label: 'Biên bản trả', icon: '📄' }
  ]

  const notifications = [
    { id: 1, text: 'Khách đặt lịch thử mới – 14:00 ngày 23/02', unread: true },
    { id: 2, text: 'Đơn quá hạn – #HD005 – Khách D', unread: true },
    { id: 3, text: 'Đơn #001 – Trả đồ trong 1 ngày', unread: false }
  ]

  const unreadCount = notifications.filter((n) => n.unread).length

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">INHERE Staff</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {sidebarMenu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition ${isActive
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
              end={m.to === '/staff'}
            >
              <span className="text-xl">{m.icon}</span>
              {m.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link to="/profile" className="flex items-center gap-3 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg">
            <span className="text-lg">👤</span> Profile
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
          >
            <span className="text-lg">🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">👤</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Xin chào, {user?.name || 'Staff A'} <span className="text-gray-600 font-normal">| STAFF</span>
              </h2>
              <p className="text-xs text-gray-500">{formatDate(currentTime)}</p>
            </div>
          </div>
          <button
            ref={notificationRef}
            onClick={() => setNotificationOpen(!notificationOpen)}
            className="relative w-11 h-11 rounded-full border-2 border-gray-300 flex items-center justify-center hover:bg-indigo-50"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            {notificationOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-4 border-b border-gray-200 font-semibold">Thông báo</div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-100 text-sm ${n.unread ? 'bg-indigo-50' : ''}`}
                  >
                    {n.text}
                  </div>
                ))}
              </div>
            )}
          </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
