import { Link } from 'react-router-dom'

export default function StaffDashboard() {
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

  return (
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
            <Link to="/staff/rent-orders" className="text-sm text-indigo-600 hover:underline">Xem tất cả</Link>
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
                className={`px-6 py-3 text-sm ${alert.unread ? 'bg-indigo-50' : ''}`}
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
  )
}
