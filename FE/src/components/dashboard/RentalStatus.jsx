import { Droplets, Shirt, Sparkles } from 'lucide-react'

const iconMap = {
  'Đang thuê': Shirt,
  'Sẵn sàng': Sparkles,
  'Đang giặt': Droplets
}

const colorMap = {
  'Đang thuê': 'bg-amber-100 text-amber-700',
  'Sẵn sàng': 'bg-emerald-100 text-emerald-700',
  'Đang giặt': 'bg-sky-100 text-sky-700'
}

const RentalStatus = ({ statuses }) => {
  const total = statuses.reduce((sum, item) => sum + item.value, 0)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-slate-900">Tình trạng thuê đồ</h3>

      <div className="space-y-3">
        {statuses.map((item) => {
          const Icon = iconMap[item.label] || Shirt
          const progress = total > 0 ? (item.value / total) * 100 : 0

          return (
            <div key={item.label} className="rounded-xl border border-slate-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`rounded-lg p-1.5 ${colorMap[item.label] || 'bg-slate-100 text-slate-700'}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                </div>
                <p className="text-sm font-semibold text-slate-900">{item.value}</p>
              </div>

              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#0F9D58] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default RentalStatus
