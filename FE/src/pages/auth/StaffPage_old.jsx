import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import '../../style/AuthPages.css' // keep shared styles
// styles have been converted to Tailwind; individual component CSS removed

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
  const [orderSearch, setOrderSearch] = useState('')
  const [darkMode, setDarkMode] = useState(false)
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

  // Update time every minute
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Persist dark mode preference
  useEffect(() => {
    const stored = localStorage.getItem('darkMode')
    if (stored !== null) setDarkMode(stored === 'true')
  }, [])
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode)
  }, [darkMode])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Placeholder data - có thể thay bằng API sau
  const stats = [
    { label: 'Đơn thuê hôm nay', value: '5', icon: '📋', color: '#4f46e5' },
    { label: 'Chờ trả đồ', value: '12', icon: '↩️', color: '#059669' },
    { label: 'Đặt lịch thử đồ', value: '8', icon: '📅', color: '#d97706' },
    { label: 'Thông báo mới', value: '3', icon: '🔔', color: '#dc2626' }
  ]

  const todayTasks = [
    { label: 'đơn cần trả hôm nay', value: 5, icon: '↩️', color: 'text-blue-600' },
    { label: 'lịch thử lúc 14:00', value: 3, icon: '👗', color: 'text-pink-600' },
    { label: 'đơn quá hạn', value: 2, icon: '⚠️', color: 'text-yellow-600' }
  ]

  const sidebarMenu = [
    { to: '/staff', label: 'Dashboard', icon: '📊' },
    { to: '/staff/rent-order', label: 'Tạo đơn thuê', icon: '➕' },
    { to: '/staff/sale-order', label: 'Tạo đơn bán', icon: '🛒' },
    { to: '/staff/fitting', label: 'Lịch thử đồ', icon: '👗' },
    { to: '/staff/return', label: 'Biên bản trả', icon: '📄' }
  ]

  const recentOrders = [
    { id: 'HD001', customer: 'Khách A', time: '10:30', status: 'Hoàn tất', statusColor: 'green' },
    { id: 'HD002', customer: 'Khách B', time: '11:00', status: 'Đang thuê', statusColor: 'blue' },
    { id: 'HD003', customer: 'Khách C', time: '11:45', status: 'Chờ duyệt', statusColor: 'orange' }
  ]

  const notifications = [
    { id: 1, title: 'Đơn #001 – Trả đồ', desc: 'Đơn hàng cần được kiểm tra trong 1 ngày tới.', time: '2h trước', unread: true },
    { id: 2, title: 'Khách đến lấy đồ', desc: 'Đơn #002 chuẩn bị sẵn sàng lúc 10:00.', time: '3h trước', unread: true },
    { id: 3, title: 'Đặt lịch thử đồ mới', desc: 'Có một yêu cầu thử đồ mới cho ngày 14/03.', time: '5h trước', unread: false }
  ]


  const unreadCount = notifications.filter((n) => n.unread).length

  const pathMatch = location.pathname.match(/^\/staff\/([^/]+)/)
  const subPath = pathMatch ? pathMatch[1] : null
  const isDashboard = !subPath

  return (
    <div className="min-h-screen flex bg-gradient-to-tr from-slate-50 via-indigo-50 to-slate-50 font-sans text-gray-800 antialiased">
      <aside className="w-64 min-w-[260px] h-screen sticky top-0 bg-white border-r border-gray-200 shadow flex flex-col flex-shrink-0">
        <div className="px-5 pt-5 pb-4 text-lg font-bold text-gray-900 border-b border-gray-200">
          INHERE Staff
        </div>
        <nav className="p-4 flex flex-col gap-1 flex-1">
          {sidebarMenu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 text-sm font-medium w-full text-left transition-colors duration-200 ${
                  isActive ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 hover:text-gray-900'
                }`
              }
              end={m.to === '/staff'}
            >
              <span className="text-xl flex-shrink-0">{m.icon}</span>
              <span className="flex-1">{m.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <label className="block text-xs font-semibold text-gray-500 mb-2">Tìm đơn nhanh</label>
          <div className="flex gap-2 max-w-none">
            <input
              type="text"
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-indigo-600 outline-none"
              placeholder="Mã đơn, tên khách..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
            <button type="button" className="w-10 h-10 border border-gray-300 rounded-lg bg-white text-lg hover:border-indigo-600 hover:bg-indigo-50" aria-label="Tìm kiếm">
              🔍
            </button>
          </div>
        </div>
        <div className="p-3 border-t border-gray-200 flex flex-col gap-1">
          <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-100">
            <span className="text-xl">👤</span>
            <span>Profile</span>
          </Link>
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 text-sm font-medium hover:bg-red-50"
            onClick={handleLogout}
          >
            <span className="text-xl">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border-b border-gray-200 px-8 py-6 shadow-md flex justify-between items-center flex-wrap gap-4 container mx-auto`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">👤</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-gray-900">
                Xin chào, {user?.name || 'Nhân viên'} <span className="font-medium text-gray-500">| Staff</span>
              </h1>
              <p className="text-sm text-gray-500">{formatDate(currentTime)}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            {/* dark mode toggle */}
            <button
              type="button"
              onClick={() => setDarkMode((v) => !v)}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors duration-200"
              aria-label="Dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                className="w-11 h-11 rounded-full border-2 border-gray-200 bg-white flex items-center justify-center transition-colors duration-200 hover:border-indigo-600 hover:bg-indigo-50"
                onClick={(e) => {
                  e.stopPropagation()
                  setNotificationOpen(!notificationOpen)
                }}
                aria-label="Thông báo"
              >
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notificationOpen && (
                <div
                  className="absolute top-full right-0 mt-2 min-w-[320px] max-w-[400px] max-h-[360px] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="px-4 py-3 text-base font-semibold text-gray-900 border-b border-gray-200">Thông báo</h3>
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-sm text-gray-700 border-b border-gray-100 transition-colors duration-150 ${
                        n.unread ? 'bg-indigo-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      {n.text}
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="p-6 text-center text-gray-500 text-sm">Không có thông báo mới</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 w-full mx-auto px-8 py-8 container">
          {isDashboard ? (
            <>
              {/* Công việc hôm nay */}
              <section className="mb-16">
                <h2 className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} text-xl font-semibold mb-4`}>Công việc hôm nay</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
                  {todayTasks.map((t, i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow hover:shadow-lg transition-shadow duration-200"
                    >
                      <span className={`block text-3xl font-extrabold leading-tight mb-2 ${t.color}`}>{t.value}</span>
                      <span className="text-sm text-gray-500">
                        {t.icon} {t.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Stats */}
              <section className="mb-12">
                <h2 className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} text-lg font-semibold mb-2`}>Tổng quan</h2>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
                  {stats.map((s, i) => (
                    <div
                      key={i}
                      className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-5 shadow hover:shadow-lg transition-shadow duration-200"
                      style={{ '--tw-border-opacity': 1, borderLeftColor: s.color }}
                    >
                      <span className="text-2xl leading-none">{s.icon}</span>
                      <div className="flex flex-col gap-1">
                        <span className="text-3xl font-extrabold text-gray-900 leading-tight">
                          {s.value}
                        </span>
                        <span className="text-sm text-gray-500">{s.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Đơn gần nhất */}
                <section>
                  <h2 className="text-lg font-semibold text-gray-700 mb-2">Đơn gần nhất</h2>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
                      <span className="font-semibold">Đơn gần nhất</span>
                      <a href="#" className="text-sm text-indigo-600 hover:underline">Xem tất cả</a>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã đơn</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{o.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.customer}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{o.time}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`inline-block px-2 py-1 rounded-full bg-${o.statusColor}-100 text-${o.statusColor}-800`}>{o.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Thông báo gần đây */}
                <section>
                  <h2 className="text-lg font-semibold text-gray-700 mb-2">Thông báo gần đây</h2>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {notifications.length > 0 ? (
                      notifications.map((note) => (
                        <div
                          key={note.id}
                          className={`px-5 py-3 border-b border-gray-100 transition-colors duration-150 ${
                            note.unread ? 'bg-indigo-100 hover:bg-indigo-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{note.title}</span>
                            <span className="text-xs text-gray-500">{note.desc}</span>
                          </div>
                          <span className="text-xs text-gray-400 mt-1">{note.time}</span>
                        </div>
                      ))
                    ) : (
                      <p className="p-8 text-center text-gray-500 text-sm">Không có thông báo mới</p>
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {STAFF_PLACEHOLDER_TITLES[subPath] || 'Chức năng'}
              </h2>
              <p className="text-sm text-gray-500">Trang đang phát triển. Vui lòng quay lại sau.</p>
              <Link to="/staff" className="auth-action-btn">
                Về Dashboard
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default StaffPage
