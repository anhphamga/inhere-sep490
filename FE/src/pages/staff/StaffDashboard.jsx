import { Link } from 'react-router-dom';

export default function StaffDashboard() {
  const stats = [
    { label: 'ĐƠN THUÊ HÔM NAY', value: '5', icon: 'DT', color: '#4f46e5' },
    { label: 'CHỜ TRẢ ĐỒ', value: '12', icon: 'TR', color: '#059669' },
    { label: 'ĐẶT LỊCH THỬ ĐỒ', value: '8', icon: 'LT', color: '#d97706' },
    { label: 'THÔNG BÁO MỚI', value: '3', icon: 'TB', color: '#dc2626' },
  ];

  const todayTasks = [
    { label: 'đơn cần trả hôm nay', value: 5, icon: 'RT', color: '#4f46e5' },
    { label: 'lịch thử lúc 14:00', value: 3, icon: 'FT', color: '#db2777' },
    { label: 'đơn quá hạn', value: 2, icon: 'AL', color: '#f59e0b' },
  ];

  const recentOrders = [
    { id: 'HD001', customer: 'Khách A', time: '10:30', status: 'Hoàn tất', statusStyle: { background: '#d1fae5', color: '#065f46' } },
    { id: 'HD002', customer: 'Khách B', time: '11:00', status: 'Đang thuê', statusStyle: { background: '#dbeafe', color: '#1e40af' } },
    { id: 'HD003', customer: 'Khách C', time: '11:45', status: 'Chờ duyệt', statusStyle: { background: '#fed7aa', color: '#92400e' } },
  ];

  const recentAlerts = [
    { id: 1, text: 'Đơn #001 - Trả đồ', desc: 'Đơn hàng cần được kiểm tra trong 1 ngày tới.', time: '2h trước', unread: true },
    { id: 2, text: 'Khách đến lấy đồ', desc: 'Đơn #002 chuẩn bị sẵn sàng lúc 10:00.', time: '3h trước', unread: true },
    { id: 3, text: 'Đặt lịch thử đồ mới', desc: 'Có một yêu cầu thử đồ mới cho ngày 14/03.', time: '5h trước', unread: false },
  ];

  return (
    <>
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-600">Công việc hôm nay</h3>
        <div className="grid grid-cols-3 gap-4">
          {todayTasks.map((task, index) => (
            <div key={index} className="rounded-xl border border-gray-200 bg-white p-6 text-center">
              <div className="mb-2 text-4xl font-bold" style={{ color: task.color }}>
                {task.value}
              </div>
              <div className="text-sm text-gray-600">{task.icon} {task.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold uppercase text-gray-600">Tổng quan</h3>
        <div className="grid grid-cols-4 gap-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-200 border-l-4 bg-white p-6" style={{ borderLeftColor: item.color }}>
              <div className="mb-1 text-3xl font-bold text-gray-900">{item.value}</div>
              <div className="text-xs font-semibold uppercase text-gray-600">{item.label}</div>
              <span className="mt-3 block text-base font-semibold text-gray-700">{item.icon}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h3 className="font-semibold">Đơn gần nhất</h3>
            <Link to="/staff/rent-orders" className="text-sm text-indigo-600 hover:underline">Xem tất cả</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600">Mã đơn</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-600">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-3 font-semibold text-gray-900">#{order.id}</td>
                  <td className="px-6 py-3 text-gray-600">{order.customer}</td>
                  <td className="px-6 py-3 text-gray-600">{order.time}</td>
                  <td className="px-6 py-3">
                    <span className="rounded-full px-3 py-1 text-xs font-semibold" style={order.statusStyle}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">!</span>
              <h3 className="font-semibold">Thông báo gần đây</h3>
            </div>
          </div>
          <div className="max-h-64 divide-y divide-gray-200 overflow-y-auto">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`px-6 py-3 text-sm ${alert.unread ? 'bg-indigo-50' : ''}`}
              >
                <div className="font-medium text-gray-900">{alert.text}</div>
                <div className="mt-1 text-xs text-gray-500">{alert.desc}</div>
                <div className="mt-1 text-xs text-gray-400">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
