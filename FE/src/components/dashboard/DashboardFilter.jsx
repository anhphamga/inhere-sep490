import { CalendarRange } from 'lucide-react'

const presets = [
  { id: 'today', label: 'Hôm nay' },
  { id: '7days', label: '7 ngày qua' },
  { id: '30days', label: '30 ngày qua' },
  { id: 'custom', label: 'Tùy chọn' }
]

const DashboardFilter = ({ value, onChange }) => {
  const preset = value?.preset || '7days'
  const from = value?.from || ''
  const to = value?.to || ''

  const update = (next) => {
    onChange?.({
      from,
      to,
      preset,
      ...next
    })
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Phân tích bảng điều khiển</h2>
          <p className="mt-1 text-sm text-slate-500">Theo dõi doanh thu và hiệu suất theo từng khoảng thời gian.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {presets.map((item) => {
            const active = preset === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => update({ preset: item.id })}
                className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <CalendarRange className="h-4 w-4 text-slate-500" />
          <span>Khoảng ngày tùy chọn</span>
        </div>

        <input
          type="date"
          value={from}
          onChange={(event) => update({ from: event.target.value, preset: 'custom' })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none ring-emerald-200 focus:ring"
        />
        <span className="hidden text-slate-400 sm:inline">đến</span>
        <input
          type="date"
          value={to}
          onChange={(event) => update({ to: event.target.value, preset: 'custom' })}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none ring-emerald-200 focus:ring"
        />
      </div>
    </section>
  )
}

export default DashboardFilter
