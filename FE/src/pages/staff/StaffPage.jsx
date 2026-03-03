import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import '../../style/AuthPages.css'

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

const STAFF_PLACEHOLDER_TITLES = {
  'rent-order': 'Tạo đơn thuê',
  'sale-order': 'Tạo đơn bán',
  'fitting': 'Lịch thử đồ',
  'return': 'Biên bản trả'
}

const StaffPage = () => {
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

  const stats = [
    { label: 'ĐƠN THUÊ HÔM NAY', value: '5', icon: '📋', color: '#4f46e5' },
    { label: 'CHỜ TRẢ ĐỒ', value: '12', icon: '📦', color: '#059669' },
    { label: 'ĐẶT LỊCH THỬ ĐỒ', value: '8', icon: '📅', color: '#d97706' },
    { label: 'THÔNG BÁO MỚI', value: '3', icon: '🔔', color: '#dc2626' }
  ]

  const todayTasks = [
    { label: 'đơn cần trả hôm nay', value: 5, icon: '↩️', color: '#4f46e5' },
    { label: 'lịch thử lúc 14:00', value: 3, icon: '👗', color: '#db2777' },
    { label: 'đơn quá hạn', value: 2, icon: '⚠️', color: '#f59e0b' }
  ]

  const sidebarMenu = [
    { to: '/staff', label: 'Dashboard', icon: '📊' },
    { to: '/staff/rent-order', label: 'Tạo đơn thuê', icon: '➕' },
    { to: '/staff/sale-order', label: 'Tạo đơn bán', icon: '🛒' },
    { to: '/staff/fitting', label: 'Lịch thử đồ', icon: '👗' },
    { to: '/staff/return', label: 'Biên bản trả', icon: '📄' }
  ]

  const recentOrders = [
    { id: 'HD001', customer: 'Khách A', time: '10:30', status: 'Hoàn tất', statusColor: 'background: #d1fae5; color: #065f46' },
    { id: 'HD002', customer: 'Khách B', time: '11:00', status: 'Đang thuê', statusColor: 'background: #dbeafe; color: #1e40af' },
    { id: 'HD003', customer: 'Khách C', time: '11:45', status: 'Chờ duyệt', statusColor: 'background: #fed7aa; color: #92400e' }
  ]

  const recentAlerts = [
    { id: 1, text: 'Đơn #001 – Trả đồ', desc: 'Đơn hàng cần được kiểm tra trong 1 ngày tới.', time: '2h trước', unread: true },
    { id: 2, text: 'Khách đến lấy đồ', desc: 'Đơn #002 chuẩn bị sẵn sàng lúc 10:00.', time: '3h trước', unread: true },
    { id: 3, text: 'Đặt lịch thử đồ mới', desc: 'Có một yêu cầu thử đồ mới cho ngày 14/03.', time: '5h trước', unread: false }
  ]

  const notifications = [
    { id: 1, text: 'Khách đặt lịch thử mới – 14:00 ngày 23/02', unread: true },
    { id: 2, text: 'Đơn quá hạn – #HD005 – Khách D', unread: true },
    { id: 3, text: 'Đơn #001 – Trả đồ trong 1 ngày', unread: false }
  ]

  const unreadCount = notifications.filter((n) => n.unread).length
  const pathMatch = location.pathname.match(/^\/staff\/([^/]+)/)
  const subPath = pathMatch ? pathMatch[1] : null
  const isDashboard = !subPath

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
                    className={`px-4 py-3 border-b border-gray-100 text-sm ${n.unread ? 'bg-indigo-50' : ''
                      }`}
                  >
                    {n.text}
                  </div>
                ))}
              </div>
            )}
          </button>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-auto bg-gray-50 p-8">
          {isDashboard ? (
            <>
              {/* Công việc hôm nay */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Công việc hôm nay</h3>
                <div className="grid grid-cols-3 gap-4">
                  {todayTasks.map((t, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                      <div className="text-4xl font-bold mb-2" style={{ color: t.color }}>
                        {t.value}
                      </div>
                      <div className="text-sm text-gray-600">{t.icon} {t.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tổng quan */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Tổng quan</h3>
                <div className="grid grid-cols-4 gap-4">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-6 border-l-4" style={{ borderLeftColor: s.color }}>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{s.value}</div>
                      <div className="text-xs text-gray-600 uppercase font-semibold">{s.label}</div>
                      <span className="text-2xl mt-3 block">{s.icon}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid 2 cột */}
              <div className="grid grid-cols-2 gap-8">
                {/* Đơn gần nhất */}
                <div className="bg-white border border-gray-200 rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold">Đơn gần nhất</h3>
                    <a href="#" className="text-sm text-indigo-600 hover:underline">Xem tất cả</a>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-gray-600 text-xs uppercase">Mã đơn</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-600 text-xs uppercase">Khách hàng</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-600 text-xs uppercase">Thời gian</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-600 text-xs uppercase">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o) => (
                        <tr key={o.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-3 font-semibold text-gray-900">#{o.id}</td>
                          <td className="px-6 py-3 text-gray-600">{o.customer}</td>
                          <td className="px-6 py-3 text-gray-600">{o.time}</td>
                          <td className="px-6 py-3">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: o.statusColor }}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Thông báo gần đây */}
                <div className="bg-white border border-gray-200 rounded-xl">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex gap-2 items-center">
                      <span className="text-lg">⚠️</span>
                      <h3 className="font-semibold">Thông báo gần đây</h3>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
                    {recentAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`px-6 py-3 text-sm ${alert.unread ? 'bg-indigo-50' : ''
                          }`}
                      >
                        <div className="font-medium text-gray-900">{alert.text}</div>
                        <div className="text-xs text-gray-500 mt-1">{alert.desc}</div>
                        <div className="text-xs text-gray-400 mt-1">{alert.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {STAFF_PLACEHOLDER_TITLES[subPath] || 'Chức năng'}
              </h2>
              <p className="text-gray-600 mb-4">Trang đang phát triển. Vui lòng quay lại sau.</p>
              <Link to="/staff" className="auth-action-btn">Về Dashboard</Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default StaffPage
