import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../store/AuthContext'
import '../../style/AuthPages.css'
import './StaffPage.css'

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
    { label: 'đơn cần trả hôm nay', value: 5, icon: '↩️' },
    { label: 'lịch thử lúc 14:00', value: 3, icon: '👗' },
    { label: 'đơn quá hạn', value: 2, icon: '⚠️' }
  ]

  const sidebarMenu = [
    { to: '/staff', label: 'Dashboard', icon: '📊' },
    { to: '/staff/rent-order', label: 'Tạo đơn thuê', icon: '➕' },
    { to: '/staff/sale-order', label: 'Tạo đơn bán', icon: '🛒' },
    { to: '/staff/fitting', label: 'Lịch thử đồ', icon: '👗' },
    { to: '/staff/return', label: 'Biên bản trả', icon: '📄' }
  ]

  const recentOrders = [
    { id: 'HD001', customer: 'Khách A', time: '10:30' },
    { id: 'HD002', customer: 'Khách B', time: '11:00' },
    { id: 'HD003', customer: 'Khách C', time: '11:45' }
  ]

  const notifications = [
    { id: 1, text: 'Khách đặt lịch thử mới – 14:00 ngày 23/02', unread: true },
    { id: 2, text: 'Đơn quá hạn – #HD005 – Khách D', unread: true },
    { id: 3, text: 'Đơn #001 – Trả đồ trong 1 ngày', unread: false }
  ]

  const recentAlerts = [
    { id: 1, type: 'ReturnSoon', text: 'Đơn #001 – Trả đồ trong 1 ngày', time: '2h trước', unread: true },
    { id: 2, type: 'PickupSoon', text: 'Đơn #002 – Khách đến lấy đồ lúc 10:00', time: '3h trước', unread: true },
    { id: 3, type: 'New', text: 'Đặt lịch thử đồ mới – 14/03', time: '5h trước', unread: false }
  ]

  const unreadCount = notifications.filter((n) => n.unread).length

  const pathMatch = location.pathname.match(/^\/staff\/([^/]+)/)
  const subPath = pathMatch ? pathMatch[1] : null
  const isDashboard = !subPath

  return (
    <div className="staff-page">
      <aside className="staff-sidebar">
        <div className="staff-sidebar-brand">INHERE Staff</div>
        <nav className="staff-sidebar-nav">
          {sidebarMenu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) => `staff-sidebar-item ${isActive ? 'active' : ''}`}
              end={m.to === '/staff'}
            >
              <span className="staff-sidebar-icon">{m.icon}</span>
              <span className="staff-sidebar-label">{m.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="staff-sidebar-search">
          <label className="staff-sidebar-search-label">Tìm đơn nhanh</label>
          <div className="staff-search-wrap staff-search-sidebar">
            <input
              type="text"
              className="staff-search-input"
              placeholder="Mã đơn, tên khách..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
            <button type="button" className="staff-search-btn" aria-label="Tìm kiếm">
              🔍
            </button>
          </div>
        </div>
        <div className="staff-sidebar-footer">
          <Link to="/profile" className="staff-sidebar-item">
            <span className="staff-sidebar-icon">👤</span>
            <span className="staff-sidebar-label">Profile</span>
          </Link>
          <button type="button" className="staff-sidebar-item staff-sidebar-logout" onClick={handleLogout}>
            <span className="staff-sidebar-icon">🚪</span>
            <span className="staff-sidebar-label">Logout</span>
          </button>
        </div>
      </aside>

      <div className="staff-body">
        <header className="staff-header">
          <div className="staff-header-user">
            <div className="staff-header-avatar">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="staff-avatar-img" />
              ) : (
                <span className="staff-avatar-fallback">👤</span>
              )}
            </div>
            <div className="staff-header-info">
              <h1 className="staff-title">
                Xin chào, {user?.name || 'Nhân viên'} <span className="staff-role">| Staff</span>
              </h1>
              <p className="staff-datetime">{formatDate(currentTime)}</p>
            </div>
          </div>
          <div className="staff-header-actions">
            <div className="staff-notification-wrap" ref={notificationRef}>
              <button
                type="button"
                className="staff-notification-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  setNotificationOpen(!notificationOpen)
                }}
                aria-label="Thông báo"
              >
                <span className="staff-notification-icon">🔔</span>
                {unreadCount > 0 && <span className="staff-notification-badge">{unreadCount}</span>}
              </button>
              {notificationOpen && (
                <div className="staff-notification-dropdown" onClick={(e) => e.stopPropagation()}>
                  <h3 className="staff-dropdown-title">Thông báo</h3>
                  {notifications.map((n) => (
                    <div key={n.id} className={`staff-dropdown-item ${n.unread ? 'unread' : ''}`}>
                      {n.text}
                    </div>
                  ))}
                  {notifications.length === 0 && <p className="staff-dropdown-empty">Không có thông báo mới</p>}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="staff-main">
          {isDashboard ? (
            <>
              {/* Công việc hôm nay */}
              <section className="staff-section">
                <h2 className="staff-section-title">Công việc hôm nay</h2>
                <div className="staff-today-tasks">
                  {todayTasks.map((t, i) => (
                    <div key={i} className="staff-task-card">
                      <span className="staff-task-value">{t.value}</span>
                      <span className="staff-task-label">
                        {t.icon} {t.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Stats */}
              <section className="staff-section">
                <h2 className="staff-section-title">Tổng quan</h2>
                <div className="staff-stats">
                  {stats.map((s, i) => (
                    <div key={i} className="staff-stat-card" style={{ '--card-accent': s.color }}>
                      <span className="staff-stat-icon">{s.icon}</span>
                      <div className="staff-stat-content">
                        <span className="staff-stat-value">{s.value}</span>
                        <span className="staff-stat-label">{s.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="staff-two-col">
                {/* Đơn gần nhất */}
                <section className="staff-section staff-section-half">
                  <h2 className="staff-section-title">Đơn gần nhất</h2>
                  <div className="staff-recent-orders">
                    {recentOrders.length > 0 ? (
                      recentOrders.map((o) => (
                        <div key={o.id} className="staff-order-item">
                          <span className="staff-order-id">Đơn #{o.id}</span>
                          <span className="staff-order-customer">– {o.customer}</span>
                          <span className="staff-order-time">{o.time}</span>
                        </div>
                      ))
                    ) : (
                      <p className="staff-empty">Không có đơn hôm nay</p>
                    )}
                  </div>
                </section>

                {/* Thông báo gần đây */}
                <section className="staff-section staff-section-half">
                  <h2 className="staff-section-title">Thông báo gần đây</h2>
                  <div className="staff-alerts">
                    {recentAlerts.length > 0 ? (
                      recentAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`staff-alert-item ${alert.unread ? 'unread' : ''}`}
                        >
                          <div className="staff-alert-body">
                            <span className="staff-alert-text">{alert.text}</span>
                            <span className="staff-alert-time">{alert.time}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="staff-empty">Không có thông báo mới</p>
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="staff-placeholder">
              <h2 className="staff-placeholder-title">{STAFF_PLACEHOLDER_TITLES[subPath] || 'Chức năng'}</h2>
              <p className="staff-placeholder-desc">Trang đang phát triển. Vui lòng quay lại sau.</p>
              <Link to="/staff" className="auth-action-btn">Về Dashboard</Link>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default StaffPage
