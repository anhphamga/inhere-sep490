const statusClassMap = {
  'Đang thuê': 'bg-amber-50 text-amber-700',
  'Đã trả': 'bg-emerald-50 text-emerald-700',
  'Chờ xác nhận': 'bg-sky-50 text-sky-700',
  'Quá hạn': 'bg-rose-50 text-rose-700'
}

const OrderTable = ({ orders }) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Đơn gần nhất</h3>
        <button className="text-sm font-medium text-[#0F9D58] transition-colors hover:text-emerald-700">
          Xem tất cả
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="pb-3 pr-4">Mã đơn</th>
              <th className="pb-3 pr-4">Khách hàng</th>
              <th className="pb-3 pr-4">Trang phục</th>
              <th className="pb-3 pr-4">Ngày thuê</th>
              <th className="pb-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50">
                <td className="py-3 pr-4 font-semibold text-slate-900">{order.code}</td>
                <td className="py-3 pr-4 text-slate-700">{order.customer}</td>
                <td className="py-3 pr-4 text-slate-700">{order.costume}</td>
                <td className="py-3 pr-4 text-slate-600">{order.rentalDate}</td>
                <td className="py-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[order.status] || 'bg-slate-100 text-slate-700'}`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default OrderTable
