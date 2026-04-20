import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

const vndCompact = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
  notation: 'compact'
})

const RevenueChart = ({ data, title = 'Doanh thu theo ngày', subtitle = 'Biểu đồ doanh thu theo khoảng thời gian đã chọn' }) => {
  const hasData = Array.isArray(data) && data.length > 0

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      {hasData ? (
        <div className="w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height={320} minWidth={0}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => vndCompact.format(value)}
              />
              <Tooltip
                cursor={{ stroke: '#bbf7d0', strokeDasharray: '4 4' }}
                formatter={(value) => [new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND',
                  maximumFractionDigits: 0
                }).format(value), 'Doanh thu']}
                labelFormatter={(label) => `Ngày: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#0F9D58"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 0, fill: '#0F9D58' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">
          Chưa có dữ liệu doanh thu để hiển thị biểu đồ.
        </div>
      )}
    </section>
  )
}

export default RevenueChart
